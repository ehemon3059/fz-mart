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
 * One cart line as seen by the coupon engine. `categoryId` is the top-level
 * Category the product's subcategory belongs to (needed for CATEGORY-scoped
 * coupons); `lineTotal` is the authoritative server-side price × qty in paisa.
 */
export interface CouponCartLine {
  productId: number;
  categoryId: number;
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
      .filter((l) => l.categoryId === coupon.categoryId)
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
 * Re-validate inside the checkout transaction and record the redemption +
 * bump the usage counter atomically. Returns the snapshotted discount.
 */
export async function redeemCoupon(
  tx: Prisma.TransactionClient,
  codeInput: string,
  lines: CouponCartLine[],
  orderId: number,
  customerPhone: string,
  customerId: string | null,
): Promise<{ code: string; discount: number }> {
  const { code, discount } = await validateCoupon(codeInput, lines, customerPhone, tx);
  const coupon = await tx.coupon.findUniqueOrThrow({ where: { code } });

  // Atomic guard on the total usage limit: only increment if still under it.
  if (coupon.usageLimit != null) {
    const bumped = await tx.coupon.updateMany({
      where: { id: coupon.id, timesUsed: { lt: coupon.usageLimit } },
      data: { timesUsed: { increment: 1 } },
    });
    if (bumped.count === 0) throw new CouponError("This coupon has reached its usage limit.");
  } else {
    await tx.coupon.update({ where: { id: coupon.id }, data: { timesUsed: { increment: 1 } } });
  }

  await tx.couponRedemption.create({
    data: { couponId: coupon.id, orderId, customerId, customerPhone, amount: discount },
  });

  return { code, discount };
}
