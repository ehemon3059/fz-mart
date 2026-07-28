"use server";

import { revalidatePath } from "next/cache";
import { setBrandPalette, setElementColors, setThemeLayout } from "@/server/settings/theme";
import {
  normalizeHex,
  ELEMENT_COLOR_SLOTS,
  SURFACE_COLOR_SLOTS,
  SURFACE_PRESETS,
  DEFAULT_ELEMENT_COLORS,
  DEFAULT_SURFACE_COLORS,
  type BrandPalette,
  type ElementColors,
  type SurfaceColors,
  type SurfacePreset,
} from "@/lib/theme-colors";
import { requirePermission } from "@/server/admin/guard";
import { getConversionConfig, saveConversionConfig } from "@/server/settings/conversion";
import { setLogoUrl } from "@/server/settings/branding";
import { getPublicBaseUrl } from "@/integrations/storage";
import { setSiteUrl } from "@/server/settings/site";
import { saveCompanyInfo } from "@/server/settings/company";
import { invalidateCache } from "@/lib/cache";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

export interface SiteUrlResult extends ActionResult {
  value?: string;
}

// Public site URL / domain. Drives every absolute link the server emits
// (marketing feeds, sitemap, canonical/OG tags, cart & stock emails), so an
// owner can point the store at their own domain without editing .env.
export async function saveSiteUrl(raw: string): Promise<SiteUrlResult> {
  await requirePermission("settings");
  const input = (raw ?? "").trim();
  if (input === "") {
    // Empty clears the override → falls back to NEXT_PUBLIC_APP_URL / localhost.
    const value = await setSiteUrl("");
    await invalidateCache("seo:sitemap"); // cached entries embed the old domain
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings/appearance");
    revalidatePath("/admin/settings/feeds");
    return { success: true, value };
  }
  const value = await setSiteUrl(input);
  if (!value) {
    return { error: "That doesn't look like a valid URL. Example: https://yourstore.com" };
  }
  // Repaint everything that embeds an absolute URL, and drop the SEO caches.
  await invalidateCache("seo:sitemap"); // cached entries embed the old domain
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings/appearance");
  revalidatePath("/admin/settings/feeds");
  return { success: true, value };
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

// Per-element colours. Every field is optional — an empty value clears that
// override so the element goes back to following the brand palette.
export async function saveElementColors(formData: FormData): Promise<ActionResult> {
  await requirePermission("settings");
  const colors: ElementColors = { ...DEFAULT_ELEMENT_COLORS };

  for (const slot of ELEMENT_COLOR_SLOTS) {
    const raw = String(formData.get(slot.key) ?? "").trim();
    if (raw === "") continue; // cleared → inherit the palette
    const normalized = normalizeHex(raw);
    if (!normalized) {
      return { error: `“${slot.label}” is not a valid hex code (e.g. #0d0625).` };
    }
    colors[slot.key] = normalized;
  }

  await setElementColors(colors);
  // Every page reads these vars from the storefront layout.
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings/appearance");
  return { success: true };
}

// Surface theme: preset, optional page background, and the per-surface
// background overrides (category bar / product card / newsletter).
// setThemeLayout re-validates every field, so invalid input can never be
// persisted. Product card style and home-page product count are no longer
// editable here; setThemeLayout preserves their stored values.
export async function saveLayout(formData: FormData): Promise<ActionResult> {
  await requirePermission("settings");

  const preset = String(formData.get("preset") ?? "");
  if (!(SURFACE_PRESETS as readonly string[]).includes(preset)) {
    return { error: "Please choose a valid theme preset." };
  }

  // An empty background field clears the override (falls back to the preset).
  const rawBg = String(formData.get("customBgColor") ?? "").trim();
  const customBgColor = rawBg === "" ? null : normalizeHex(rawBg);
  if (rawBg !== "" && !customBgColor) {
    return { error: "The custom background is not a valid hex code (e.g. #0b1220)." };
  }

  const surfaceColors: SurfaceColors = { ...DEFAULT_SURFACE_COLORS };
  for (const slot of SURFACE_COLOR_SLOTS) {
    const raw = String(formData.get(slot.key) ?? "").trim();
    if (raw === "") continue; // cleared → follow the preset
    const normalized = normalizeHex(raw);
    if (!normalized) {
      return { error: `“${slot.label}” is not a valid hex code (e.g. #0b1220).` };
    }
    surfaceColors[slot.key] = normalized;
  }

  await setThemeLayout({
    preset: preset as SurfacePreset,
    customBgColor,
    surfaceColors,
  });

  // Repaint the whole storefront: the layout reads the theme and the home page
  // reads the product count.
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings/appearance");
  return { success: true };
}

// True when `value` is a branding image URL we produced ourselves — either the
// local dev path (/uploads/branding/<file>) or a URL under the configured R2
// bucket's branding/ folder. We never persist an arbitrary caller-supplied URL,
// and the key is restricted to a plain UUID.ext (no path traversal / query).
function isOwnBrandingImage(value: string): boolean {
  if (/^\/uploads\/branding\/[\w.-]+$/.test(value)) return true;
  const base = getPublicBaseUrl();
  if (base && value.startsWith(`${base}/`)) {
    const key = value.slice(base.length + 1);
    return /^branding\/[\w.-]+$/.test(key);
  }
  return false;
}

// Store logo. An empty string clears it (revert to the default text wordmark).
export async function saveLogo(url: string): Promise<ActionResult> {
  await requirePermission("settings");
  const trimmed = (url ?? "").trim();
  if (trimmed !== "" && !isOwnBrandingImage(trimmed)) {
    return { error: "Invalid logo image. Please upload the image again." };
  }
  await setLogoUrl(trimmed);
  // The header reads the logo in the storefront layout, so repaint every page.
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

// Footer company info: description, contact details, social links. Every
// field is optional — Footer.tsx only renders what's actually set.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function saveCompanyInfoAction(formData: FormData): Promise<ActionResult> {
  await requirePermission("settings");

  const email = String(formData.get("email") ?? "").trim();
  if (email && !EMAIL_RE.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  await saveCompanyInfo({
    description: String(formData.get("description") ?? ""),
    address: String(formData.get("address") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email,
    facebookUrl: String(formData.get("facebookUrl") ?? ""),
    instagramUrl: String(formData.get("instagramUrl") ?? ""),
    youtubeUrl: String(formData.get("youtubeUrl") ?? ""),
    twitterUrl: String(formData.get("twitterUrl") ?? ""),
    copyrightText: String(formData.get("copyrightText") ?? "") || "FZ Mart",
  });
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings/appearance");
  return { success: true };
}
