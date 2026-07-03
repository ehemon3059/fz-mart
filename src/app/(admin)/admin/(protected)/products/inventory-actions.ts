"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/admin/guard";
import { logActivity } from "@/server/admin/audit";
import { adjustStock, InventoryError } from "@/server/inventory";

export interface AdjustResult {
  error?: string;
  newStock?: number;
}

export async function adjustStockAction(
  productId: number,
  formData: FormData,
): Promise<AdjustResult> {
  const admin = await requirePermission("products");

  const sign = formData.get("direction") === "remove" ? -1 : 1;
  const amount = Math.abs(Number(formData.get("amount") ?? 0));
  const reason = String(formData.get("reason") ?? "");

  try {
    const { newStock } = await adjustStock({
      productId,
      delta: sign * amount,
      reason,
      adminName: admin.username,
    });
    await logActivity({
      adminId: admin.id,
      actorName: admin.username,
      action: "stock.adjust",
      detail: `Product #${productId}: ${sign > 0 ? "+" : "-"}${amount} (${reason}) → ${newStock}`,
    });
    revalidatePath(`/admin/products/${productId}/edit`);
    return { newStock };
  } catch (err) {
    if (err instanceof InventoryError) return { error: err.message };
    throw err;
  }
}
