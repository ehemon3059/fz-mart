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
  /** Discount in paisa for the given subtotal. */
  discount: number;
}

/**
 * Compute the discount a coupon yields on `subtotal` (paisa), or throw
 * CouponError with a customer-facing reason. `customerPhone` is used for the
 * per-customer usage limit; pass null before the phone is known (the limit is
 * then re-checked at redemption).
 */
export async function validateCoupon(
  codeInput: string,
  subtotal: number,
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
  if (subtotal < coupon.minOrder) {
    throw new CouponError(
      `Add ৳${((coupon.minOrder - subtotal) / 100).toFixed(0)} more to use this coupon.`,
    );
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
    coupon.type === "PERCENT" ? Math.floor((subtotal * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
  // Never discount more than the subtotal.
  discount = Math.min(discount, subtotal);
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
  subtotal: number,
  orderId: number,
  customerPhone: string,
  customerId: string | null,
): Promise<{ code: string; discount: number }> {
  const { code, discount } = await validateCoupon(codeInput, subtotal, customerPhone, tx);
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
