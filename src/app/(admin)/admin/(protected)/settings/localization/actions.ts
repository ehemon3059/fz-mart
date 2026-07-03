"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/admin/guard";
import { saveLocalizationConfig } from "@/server/settings/localization";
import { isLocale } from "@/i18n/config";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

export async function saveLocalizationSettings(formData: FormData): Promise<ActionResult> {
  await requirePermission("settings");
  const defaultLocale = String(formData.get("defaultLocale") ?? "en");
  if (!isLocale(defaultLocale)) return { error: "Invalid default locale." };

  await saveLocalizationConfig({
    defaultLocale,
    banglaDigits: formData.get("banglaDigits") === "on",
  });
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings/localization");
  return { success: true };
}
