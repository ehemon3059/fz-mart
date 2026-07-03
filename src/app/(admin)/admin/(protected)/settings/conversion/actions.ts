"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/admin/guard";
import { getConversionConfig, saveConversionConfig } from "@/server/settings/conversion";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

// Saves the OTP / returns / abandoned-cart fields, PRESERVING the chat fields
// (which are edited on the Appearance page — same setting group).
export async function saveConversionSettings(formData: FormData): Promise<ActionResult> {
  await requirePermission("settings");
  const current = await getConversionConfig();

  const returnWindowDays = Number(formData.get("returnWindowDays") ?? 0);
  const abandonedCartDelayHours = Number(formData.get("abandonedCartDelayHours") ?? 0);
  if (returnWindowDays <= 0 || abandonedCartDelayHours <= 0) {
    return { error: "Return window and reminder delay must be positive numbers." };
  }

  await saveConversionConfig({
    ...current,
    otpEnabled: formData.get("otpEnabled") === "on",
    returnWindowDays,
    abandonedCartEnabled: formData.get("abandonedCartEnabled") === "on",
    abandonedCartDelayHours,
    abandonedCartMessage:
      String(formData.get("abandonedCartMessage") ?? "").trim() || current.abandonedCartMessage,
  });

  revalidatePath("/admin/settings/conversion");
  return { success: true };
}
