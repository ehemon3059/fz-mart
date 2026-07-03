"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/server/admin/guard";
import { logActivity } from "@/server/admin/audit";
import {
  createCoupon,
  updateCoupon,
  deleteCoupon,
  CouponAdminError,
  type CouponInput,
} from "@/server/coupons/admin";
import { takaToPaisa } from "@/lib/money";
import type { CouponType } from "@prisma/client";

export interface ActionResult {
  error?: string;
}

function parseForm(formData: FormData): CouponInput {
  const type: CouponType = formData.get("type") === "FIXED" ? "FIXED" : "PERCENT";
  const valueRaw = Number(formData.get("value") ?? 0);
  // PERCENT stores a whole number; FIXED collects taka → paisa.
  const value = type === "FIXED" ? takaToPaisa(valueRaw) : Math.round(valueRaw);

  const num = (name: string): number | null => {
    const v = formData.get(name);
    if (v == null || String(v).trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const date = (name: string): Date | null => {
    const v = String(formData.get(name) ?? "").trim();
    return v ? new Date(v) : null;
  };
  const maxDiscountTaka = num("maxDiscount");

  return {
    code: String(formData.get("code") ?? ""),
    type,
    value,
    minOrder: takaToPaisa(Number(formData.get("minOrder") ?? 0) || 0),
    maxDiscount: maxDiscountTaka != null ? takaToPaisa(maxDiscountTaka) : null,
    usageLimit: num("usageLimit"),
    perCustomerLimit: num("perCustomerLimit"),
    startsAt: date("startsAt"),
    endsAt: date("endsAt"),
    isActive: formData.get("isActive") === "on",
  };
}

export async function saveCoupon(id: number | null, formData: FormData): Promise<ActionResult> {
  const admin = await requirePermission("coupons");
  const input = parseForm(formData);

  try {
    if (id) {
      await updateCoupon(id, input);
    } else {
      await createCoupon(input);
    }
  } catch (err) {
    if (err instanceof CouponAdminError) return { error: err.message };
    throw err;
  }

  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: id ? "coupon.update" : "coupon.create",
    detail: input.code.toUpperCase(),
  });

  revalidatePath("/admin/coupons");
  redirect("/admin/coupons");
}

export async function removeCoupon(id: number): Promise<ActionResult> {
  const admin = await requirePermission("coupons");
  try {
    await deleteCoupon(id);
  } catch {
    return { error: "Could not delete this coupon." };
  }
  await logActivity({ adminId: admin.id, actorName: admin.username, action: "coupon.delete", detail: `#${id}` });
  revalidatePath("/admin/coupons");
  return {};
}
