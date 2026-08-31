"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/admin/guard";
import { logActivity } from "@/server/admin/audit";
import { adjustStock, InventoryError } from "@/server/inventory";
import { setListedQuantities, ListingError } from "@/server/inventory/listing";

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

// ── Listing quantity ────────────────────────────────────────────────────────

export interface ListingResult {
  error?: string;
  success?: string;
}

/**
 * Set how many units of a product are offered for sale.
 *
 * Deliberately NOT routed through adjustStock: this changes no stock and writes
 * no StockMovement (see server/inventory/listing.ts for why). It is audited as
 * a catalogue decision instead, which is what it is.
 *
 * Rows arrive as parallel arrays from the repeating options UI. A blank box
 * means UNCAPPED — "sell whatever is on hand" — which is a different statement
 * from a typed 0 ("list nothing"), so the two must not be collapsed here.
 */
export async function setListedQtyAction(
  productId: number,
  formData: FormData,
): Promise<ListingResult> {
  const admin = await requirePermission("products");

  const variantIds = formData.getAll("listingVariantId").map(String);
  const quantities = formData.getAll("listingQty").map(String);

  const updates = variantIds.map((raw, i) => {
    const qty = quantities[i]?.trim() ?? "";
    return {
      variantId: raw ? Number(raw) : null,
      listedQty: qty === "" ? null : Math.floor(Number(qty)),
    };
  });

  if (updates.some((u) => u.listedQty != null && !Number.isFinite(u.listedQty))) {
    return { error: "Quantity for sale must be a whole number, or blank for no limit." };
  }

  try {
    await setListedQuantities(productId, updates);
  } catch (err) {
    if (err instanceof ListingError) return { error: err.message };
    throw err;
  }

  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: "product.listing_qty",
    detail:
      `Product #${productId}: ` +
      updates
        .map((u) => `${u.variantId ? `v${u.variantId}` : "all"}=${u.listedQty ?? "unlimited"}`)
        .join(", "),
  });

  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/admin/products");
  revalidatePath("/");
  return { success: "Updated what's for sale." };
}
