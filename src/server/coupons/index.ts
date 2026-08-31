import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Coupon validation + discount maths. The storefront calls validateCoupon to
// preview a discount; createOrder calls the same logic (redeemCoupon, inside
// the checkout transaction) so the value shown and the value charged can never
// diverge, and usage limits are enforced atomically.

export class CouponError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CouponError";
  }
}

export interface CouponResult {
  code: string;
  /** Discount in paisa for the given cart. */
  discount: number;
}

/**
 * One cart line as seen by the coupon engine. `categoryIds` is the product's
 * full category lineage — its own node plus every ancestor — so a CATEGORY
 * coupon set on any level in that chain matches. `lineTotal` is the
 * authoritative server-side price × qty in paisa.
 */
export interface CouponCartLine {
  productId: number;
  categoryIds: number[];
  lineTotal: number;
}

/**
 * Sum the cart lines a coupon is allowed to discount. For ALL coupons that's
 * the whole cart; for CATEGORY/PRODUCT it's only the matching lines. Returned
 * separately from the full subtotal so PERCENT/FIXED apply to the eligible
 * amount, while minOrder is still checked against the full cart total.
 */
function eligibleSubtotal(
  coupon: { appliesTo: string; categoryId: number | null; productId: number | null },
  lines: CouponCartLine[],
): number {
  if (coupon.appliesTo === "PRODUCT") {
    return lines
      .filter((l) => l.productId === coupon.productId)
      .reduce((sum, l) => sum + l.lineTotal, 0);
  }
  if (coupon.appliesTo === "CATEGORY") {
    return lines
      .filter((l) => coupon.categoryId != null && l.categoryIds.includes(coupon.categoryId))
      .reduce((sum, l) => sum + l.lineTotal, 0);
  }
  return lines.reduce((sum, l) => sum + l.lineTotal, 0);
}

/**
 * Compute the discount a coupon yields on the given cart lines (paisa), or
 * throw CouponError with a customer-facing reason. `customerPhone` is used for
 * the per-customer usage limit; pass null before the phone is known (the limit
 * is then re-checked at redemption).
 */
export async function validateCoupon(
  codeInput: string,
  lines: CouponCartLine[],
  customerPhone: string | null,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<CouponResult> {
  const code = codeInput.trim().toUpperCase();
  if (!code) throw new CouponError("Enter a coupon code.");

  const coupon = await tx.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) {
    throw new CouponError("This coupon code is not valid.");
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    throw new CouponError("This coupon isn't active yet.");
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    throw new CouponError("This coupon has expired.");
  }

  // minOrder gates on the FULL cart total; the discount applies to the
  // eligible slice (the whole cart for ALL coupons).
  const cartTotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  if (cartTotal < coupon.minOrder) {
    throw new CouponError(
      `Add ৳${((coupon.minOrder - cartTotal) / 100).toFixed(0)} more to use this coupon.`,
    );
  }

  const eligible = eligibleSubtotal(coupon, lines);
  if (eligible <= 0) {
    throw new CouponError("This coupon doesn't apply to any item in your cart.");
  }

  // Both usage checks below are ADVISORY — they give a fast, friendly "already
  // used up" message on the cart preview, but they are check-then-act and MUST
  // NOT be relied on for correctness. redeemCoupon re-enforces both under a row
  // lock at write time; that is where the limits are actually binding.
  if (coupon.usageLimit != null && coupon.timesUsed >= coupon.usageLimit) {
    throw new CouponError("This coupon has reached its usage limit.");
  }
  if (coupon.perCustomerLimit != null && customerPhone) {
    const used = await tx.couponRedemption.count({
      where: { couponId: coupon.id, customerPhone },
    });
    if (used >= coupon.perCustomerLimit) {
      throw new CouponError("You've already used this coupon.");
    }
  }

  let discount =
    coupon.type === "PERCENT" ? Math.floor((eligible * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
  // Never discount more than the eligible lines are worth.
  discount = Math.min(discount, eligible);
  if (discount <= 0) throw new CouponError("This coupon gives no discount on your cart.");

  return { code, discount };
}

/**
 * Re-validate inside the checkout transaction and claim the redemption
 * atomically. Returns the snapshotted discount.
 *
 * Concurrency is the whole point of this function. Two shoppers submitting the
 * last redemption of a coupon at the same instant both pass validateCoupon's
 * read of `timesUsed`, so the limits can only be enforced at WRITE time:
 *
 *  1. Lock the coupon row (`SELECT ... FOR UPDATE`). Redemptions for one coupon
 *     are thereby serialised. Locking CouponRedemption rows instead would not
 *     work — the first claimant for a phone has zero rows to lock.
 *  2. Re-read `timesUsed` and the per-customer count WITH `FOR UPDATE`. On TiDB
 *     (pessimistic, REPEATABLE READ) the lock serialises but does NOT refresh
 *     the transaction snapshot, so a plain read after locking still returns the
 *     stale pre-lock value. See src/server/customers/addresses.ts for the same
 *     pattern.
 *  3. Claim with a conditional `updateMany` guarded on the freshly-read count,
 *     and treat `count === 0` as "someone else took the last one".
 *
 * The caller runs this inside the checkout transaction, so a CouponError here
 * rolls back the order, its items and its stock reservations together — there
 * is no state in which an order exists having consumed a limit it never got.
 */
export async function redeemCoupon(
  tx: Prisma.TransactionClient,
  codeInput: string,
  lines: CouponCartLine[],
  orderId: number,
  customerPhone: string,
  customerId: string | null,
): Promise<{ code: string; discount: number }> {
  // Cheap pre-checks (expiry, isActive, minOrder, scope) plus the discount
  // maths, all from server-side prices. The usage-limit checks it performs are
  // advisory only — the binding ones are below, under the row lock.
  const { code, discount } = await validateCoupon(codeInput, lines, customerPhone, tx);

  // (1) Serialise every redemption of this coupon behind a row lock, and (2)
  // re-read the counter in the same locking statement so the value is post-lock
  // rather than from the pinned snapshot.
  const locked = await tx.$queryRaw<{ id: number; timesUsed: number; usageLimit: number | null; perCustomerLimit: number | null; isActive: boolean }[]>`
    SELECT id, timesUsed, usageLimit, perCustomerLimit, isActive
    FROM Coupon
    WHERE code = ${code}
    FOR UPDATE
  `;
  const coupon = locked[0];
  // Deleted or deactivated between validation and the lock.
  if (!coupon || !coupon.isActive) {
    throw new CouponError("This coupon code is not valid.");
  }

  // Total usage limit: claim one slot conditionally. The predicate uses the
  // freshly-locked usageLimit, so an admin lowering the limit mid-checkout is
  // respected too.
  if (coupon.usageLimit != null) {
    if (coupon.timesUsed >= coupon.usageLimit) {
      throw new CouponError("This coupon has reached its usage limit.");
    }
    const claimed = await tx.coupon.updateMany({
      where: { id: coupon.id, timesUsed: { lt: coupon.usageLimit } },
      data: { timesUsed: { increment: 1 } },
    });
    if (claimed.count === 0) {
      throw new CouponError("This coupon has reached its usage limit.");
    }
  } else {
    await tx.coupon.update({
      where: { id: coupon.id },
      data: { timesUsed: { increment: 1 } },
    });
  }

  // Per-customer limit, keyed on phone (customerId is null for guests, so the
  // phone is the only identity every order has). Counted with FOR UPDATE for
  // the same snapshot reason — a plain count() here reads pre-lock state and
  // lets concurrent orders from one phone all pass.
  if (coupon.perCustomerLimit != null) {
    // Selects the ROWS, not COUNT(*): an aggregate with FOR UPDATE locks
    // nothing useful and is not guaranteed to read past the pinned snapshot.
    // Bounded by the limit, so this stays a couple of rows.
    const used = await tx.$queryRaw<{ id: number }[]>`
      SELECT id
      FROM CouponRedemption
      WHERE couponId = ${coupon.id} AND customerPhone = ${customerPhone}
      LIMIT ${coupon.perCustomerLimit}
      FOR UPDATE
    `;
    if (used.length >= coupon.perCustomerLimit) {
      // Rolls back the increment above along with the rest of the checkout.
      throw new CouponError("You've already used this coupon.");
    }
  }

  await tx.couponRedemption.create({
    data: { couponId: coupon.id, orderId, customerId, customerPhone, amount: discount },
  });

  return { code, discount };
}
