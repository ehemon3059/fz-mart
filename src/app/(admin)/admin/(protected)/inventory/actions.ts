"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/admin/guard";
import { saveInventoryConfig } from "@/server/settings/inventory";
import { sendLowStockDigest } from "@/server/inventory/digest";

export interface ActionResult {
  error?: string;
  success?: string;
}

// The low-stock digest toggle used to live on Settings → Inventory (a page that
// held nothing else, and so was removed). It sits here now, on the screen where
// low stock is actually read.
//
// NOTE this is a deliberate permission change: the toggle was OWNER-only under
// "settings", and is now reachable by MANAGER under "inventory". It is a
// notification preference — the cost of a manager flipping it is that an email
// stops arriving, which is nothing like the payment and courier credentials
// "settings" exists to gate.

export async function setDigestEnabled(enabled: boolean): Promise<ActionResult> {
  await requirePermission("inventory");
  await saveInventoryConfig({ digestEnabled: enabled });
  revalidatePath("/admin/inventory");
  return { success: enabled ? "Daily digest on." : "Daily digest off." };
}

/** Send the digest right now, for testing. */
export async function sendDigestNow(): Promise<ActionResult> {
  await requirePermission("inventory");
  await sendLowStockDigest();
  return { success: "Digest queued (if enabled and any products are low)." };
}
