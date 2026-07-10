import { prisma } from "@/lib/prisma";
import type { CouponType, CouponScope } from "@prisma/client";

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
  /** Scope: whole cart, one category, or one product. */
  appliesTo: CouponScope;
  categoryId: number | null;
  productId: number | null;
}

async function validate(input: CouponInput): Promise<void> {
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
  if (input.appliesTo === "CATEGORY") {
    if (input.categoryId == null) {
      throw new CouponAdminError("Choose a category for a category coupon.");
    }
    const exists = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!exists) throw new CouponAdminError("That category no longer exists.");
  }
  if (input.appliesTo === "PRODUCT") {
    if (input.productId == null) {
      throw new CouponAdminError("Choose a product for a product coupon.");
    }
    const exists = await prisma.product.findUnique({ where: { id: input.productId } });
    if (!exists) throw new CouponAdminError("That product no longer exists.");
  }
}

/** Normalize scope so unused foreign keys are always null. */
function scopeFields(input: CouponInput) {
  return {
    appliesTo: input.appliesTo,
    categoryId: input.appliesTo === "CATEGORY" ? input.categoryId : null,
    productId: input.appliesTo === "PRODUCT" ? input.productId : null,
  };
}

export async function listCoupons() {
  return prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { redemptions: true } },
      category: { select: { name: true } },
      product: { select: { name: true } },
    },
  });
}

export async function getCouponById(id: number) {
  return prisma.coupon.findUnique({ where: { id } });
}

export async function createCoupon(input: CouponInput) {
  await validate(input);
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
      ...scopeFields(input),
    },
  });
}

export async function updateCoupon(id: number, input: CouponInput) {
  await validate(input);
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
      ...scopeFields(input),
    },
  });
}

export async function deleteCoupon(id: number) {
  await prisma.coupon.delete({ where: { id } });
}

// Lightweight option lists for the coupon form's scope pickers.
export async function getCouponScopeOptions() {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { categories, products };
}
