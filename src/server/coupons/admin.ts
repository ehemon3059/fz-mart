import { prisma } from "@/lib/prisma";
import type { CouponType } from "@prisma/client";

// Admin CRUD for coupons. Validation lives here so both the create and update
// paths share it.

export class CouponAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CouponAdminError";
  }
}

export interface CouponInput {
  code: string;
  type: CouponType;
  /** Whole percent for PERCENT, or paisa for FIXED. */
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
}

function validate(input: CouponInput): void {
  if (!input.code.trim()) throw new CouponAdminError("Code is required.");
  if (input.type === "PERCENT" && (input.value <= 0 || input.value > 100)) {
    throw new CouponAdminError("Percent value must be between 1 and 100.");
  }
  if (input.type === "FIXED" && input.value <= 0) {
    throw new CouponAdminError("Fixed amount must be greater than zero.");
  }
  if (input.startsAt && input.endsAt && input.startsAt > input.endsAt) {
    throw new CouponAdminError("Start date must be before end date.");
  }
}

export async function listCoupons() {
  return prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { redemptions: true } } },
  });
}

export async function getCouponById(id: number) {
  return prisma.coupon.findUnique({ where: { id } });
}

export async function createCoupon(input: CouponInput) {
  validate(input);
  const code = input.code.trim().toUpperCase();
  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) throw new CouponAdminError("A coupon with that code already exists.");

  return prisma.coupon.create({
    data: {
      code,
      type: input.type,
      value: input.value,
      minOrder: input.minOrder,
      maxDiscount: input.maxDiscount,
      usageLimit: input.usageLimit,
      perCustomerLimit: input.perCustomerLimit,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      isActive: input.isActive,
    },
  });
}

export async function updateCoupon(id: number, input: CouponInput) {
  validate(input);
  const code = input.code.trim().toUpperCase();
  const clash = await prisma.coupon.findFirst({ where: { code, id: { not: id } } });
  if (clash) throw new CouponAdminError("A coupon with that code already exists.");

  return prisma.coupon.update({
    where: { id },
    data: {
      code,
      type: input.type,
      value: input.value,
      minOrder: input.minOrder,
      maxDiscount: input.maxDiscount,
      usageLimit: input.usageLimit,
      perCustomerLimit: input.perCustomerLimit,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      isActive: input.isActive,
    },
  });
}

export async function deleteCoupon(id: number) {
  await prisma.coupon.delete({ where: { id } });
}
