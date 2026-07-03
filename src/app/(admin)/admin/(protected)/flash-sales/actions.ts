"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { takaToPaisa } from "@/lib/money";
import { requirePermission } from "@/server/admin/guard";
import {
  createFlashSale,
  updateFlashSale,
  deleteFlashSale,
  type FlashSaleProductInput,
} from "@/server/flash-sales/admin";

export interface ActionResult {
  error?: string;
}

function parseProducts(formData: FormData): FlashSaleProductInput[] {
  const productIds = formData.getAll("productId").map((v) => Number(v));
  return productIds.map((productId) => {
    const raw = formData.get(`salePrice_${productId}`);
    const salePriceTaka = raw && String(raw).trim() ? Number(raw) : null;
    return {
      productId,
      salePrice: salePriceTaka != null ? takaToPaisa(salePriceTaka) : null,
    };
  });
}

export async function saveFlashSale(
  id: number | null,
  formData: FormData,
): Promise<ActionResult> {
  await requirePermission("flash-sales");
  const name = String(formData.get("name") ?? "").trim();
  const startsAtRaw = String(formData.get("startsAt") ?? "");
  const endsAtRaw = String(formData.get("endsAt") ?? "");
  const isActive = formData.get("isActive") === "on";
  const products = parseProducts(formData);

  if (!name) return { error: "Name is required." };
  if (!startsAtRaw || !endsAtRaw) {
    return { error: "Start and end time are required." };
  }
  const startsAt = new Date(startsAtRaw);
  const endsAt = new Date(endsAtRaw);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { error: "Invalid date." };
  }
  if (endsAt <= startsAt) {
    return { error: "End time must be after start time." };
  }
  if (products.length === 0) {
    return { error: "Select at least one product." };
  }

  const input = { name, startsAt, endsAt, isActive, products };

  if (id) {
    await updateFlashSale(id, input);
  } else {
    await createFlashSale(input);
  }

  revalidatePath("/admin/flash-sales");
  revalidatePath("/");
  redirect("/admin/flash-sales");
}

export async function removeFlashSale(id: number): Promise<ActionResult> {
  await requirePermission("flash-sales");
  await deleteFlashSale(id);
  revalidatePath("/admin/flash-sales");
  revalidatePath("/");
  return {};
}
