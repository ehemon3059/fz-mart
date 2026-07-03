"use server";

import { revalidatePath } from "next/cache";
import { setBrandPalette } from "@/server/settings/theme";
import { normalizeHex, type BrandPalette } from "@/lib/theme-colors";
import { requirePermission } from "@/server/admin/guard";
import { getConversionConfig, saveConversionConfig } from "@/server/settings/conversion";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

const FIELDS = ["brand", "brandDark", "brandTint", "brandTint2"] as const;

export async function saveTheme(formData: FormData): Promise<ActionResult> {
  await requirePermission("settings");
  const palette = {} as BrandPalette;

  for (const field of FIELDS) {
    const normalized = normalizeHex(String(formData.get(field) ?? ""));
    if (!normalized) {
      return { error: "One of the colours is not a valid hex code. Please try again." };
    }
    palette[field] = normalized;
  }

  await setBrandPalette(palette);
  // Repaint the whole storefront (every page reads the palette from the layout).
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings/appearance");
  return { success: true };
}

// Chat-button links share the "conversion" setting group; preserve the other
// conversion fields (OTP/returns/abandoned-cart) when saving just these.
export async function saveChatButtons(formData: FormData): Promise<ActionResult> {
  await requirePermission("settings");
  const current = await getConversionConfig();
  await saveConversionConfig({
    ...current,
    whatsappNumber: String(formData.get("whatsappNumber") ?? ""),
    messengerUrl: String(formData.get("messengerUrl") ?? ""),
  });
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings/appearance");
  return { success: true };
}
