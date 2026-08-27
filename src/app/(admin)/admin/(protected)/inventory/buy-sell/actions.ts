"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/admin/guard";
import { logActivity } from "@/server/admin/audit";
import { takaToPaisa } from "@/lib/money";
import { PurchasingError } from "@/server/purchasing";
import {
  getBackfillTarget,
  recordHistoricalPurchase,
  type BackfillTarget,
} from "@/server/purchasing/sourcing";

export interface ActionResult {
  error?: string;
  success?: string;
}

/**
 * Full option detail for the one product the panel is opening on.
 *
 * Fetched on open rather than shipped with the list: a shop with a few hundred
 * sized products would otherwise send every variant of every row to the browser
 * to populate a panel that only ever shows one of them.
 */
export async function loadBackfillTargetAction(
  productId: number,
): Promise<{ error?: string; target?: BackfillTarget }> {
  await requirePermission("inventory");
  const target = await getBackfillTarget(productId);
  if (!target) return { error: "That product no longer exists." };
  return { target };
}

/** One option's entry, as typed in the panel. Cost is in TAKA here — the whole
 *  UI speaks taka and only the server edge converts to paisa. */
export interface BackfillLineInput {
  variantId: number | null;
  quantity: number;
  unitCostTaka: number;
}

export async function recordPurchaseAction(input: {
  productId: number;
  supplierId: number;
  purchasedOn?: string | null;
  note?: string | null;
  lines: BackfillLineInput[];
}): Promise<ActionResult> {
  const admin = await requirePermission("inventory");

  if (!Number.isInteger(input.supplierId) || input.supplierId <= 0) {
    return { error: "Choose the supplier this was bought from." };
  }

  // A date-only string is parsed at local midnight rather than through the
  // Date(string) UTC path, so "bought on the 3rd" cannot land on the 2nd for an
  // admin sitting in Dhaka.
  let purchasedOn: Date | null = null;
  if (input.purchasedOn) {
    const parsed = new Date(`${input.purchasedOn}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return { error: "That purchase date isn't valid." };
    if (parsed.getTime() > Date.now()) {
      return { error: "A past purchase can't be dated in the future." };
    }
    purchasedOn = parsed;
  }

  try {
    const po = await recordHistoricalPurchase({
      productId: input.productId,
      supplierId: input.supplierId,
      purchasedOn,
      note: input.note ?? null,
      lines: input.lines.map((l) => ({
        variantId: l.variantId,
        quantity: Math.trunc(l.quantity),
        unitCost: takaToPaisa(l.unitCostTaka),
      })),
    });

    await logActivity({
      adminId: admin.id,
      actorName: admin.username,
      action: "purchase.backfill",
      detail: `${po.poNo} · product #${input.productId}`,
    });
  } catch (err) {
    if (err instanceof PurchasingError) return { error: err.message };
    throw err;
  }

  revalidatePath("/admin/inventory/buy-sell");
  revalidatePath("/admin/inventory/purchase-orders");
  return { success: "Purchase recorded." };
}
