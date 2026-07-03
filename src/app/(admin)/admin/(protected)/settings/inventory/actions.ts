"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/admin/guard";
import { saveInventoryConfig } from "@/server/settings/inventory";
import { sendLowStockDigest } from "@/server/inventory/digest";

export interface ActionResult {
  error?: string;
  success?: string;
}

export async function saveInventorySettings(formData: FormData): Promise<ActionResult> {
  await requirePermission("settings");
  await saveInventoryConfig({ digestEnabled: formData.get("digestEnabled") === "on" });
  revalidatePath("/admin/settings/inventory");
  return { success: "Saved." };
}

/** Send the digest right now (for testing / on-demand). */
export async function sendDigestNow(): Promise<ActionResult> {
  await requirePermission("settings");
  await sendLowStockDigest();
  return { success: "Digest queued (if enabled and any products are low)." };
}
