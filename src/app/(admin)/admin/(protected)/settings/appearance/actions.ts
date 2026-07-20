"use server";

import { revalidatePath } from "next/cache";
import { setBrandPalette, setThemeLayout } from "@/server/settings/theme";
import {
  normalizeHex,
  CARD_STYLES,
  SURFACE_PRESETS,
  type BrandPalette,
  type CardStyle,
  type SurfacePreset,
} from "@/lib/theme-colors";
import { requirePermission } from "@/server/admin/guard";
import { getConversionConfig, saveConversionConfig } from "@/server/settings/conversion";
import { setLogoUrl } from "@/server/settings/branding";
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

// Surface theme + layout: preset, optional custom background, product card
// style, and the home-page product count. setThemeLayout re-validates and
// clamps every field, so invalid input can never be persisted.
export async function saveLayout(formData: FormData): Promise<ActionResult> {
  await requirePermission("settings");

  const preset = String(formData.get("preset") ?? "");
  const cardStyle = String(formData.get("productCardStyle") ?? "");
  if (!(SURFACE_PRESETS as readonly string[]).includes(preset)) {
    return { error: "Please choose a valid theme preset." };
  }
  if (!(CARD_STYLES as readonly string[]).includes(cardStyle)) {
    return { error: "Please choose a valid product card style." };
  }

  // An empty background field clears the override (falls back to the preset).
  const rawBg = String(formData.get("customBgColor") ?? "").trim();
  const customBgColor = rawBg === "" ? null : normalizeHex(rawBg);
  if (rawBg !== "" && !customBgColor) {
    return { error: "The custom background is not a valid hex code (e.g. #0b1220)." };
  }

  const count = Number(formData.get("homeProductCount"));
  if (!Number.isFinite(count)) {
    return { error: "Home product count must be a number." };
  }

  await setThemeLayout({
    preset: preset as SurfacePreset,
    customBgColor,
    productCardStyle: cardStyle as CardStyle,
    homeProductCount: count,
  });

  // Repaint the whole storefront: the layout reads the theme and the home page
  // reads the product count.
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings/appearance");
  return { success: true };
}

// Store logo. An empty string clears it (revert to the default text wordmark).
// A non-empty value must be a path we produced under /uploads/branding/ — we
// never persist an arbitrary caller-supplied URL.
export async function saveLogo(url: string): Promise<ActionResult> {
  await requirePermission("settings");
  const trimmed = (url ?? "").trim();
  if (trimmed !== "" && !/^\/uploads\/branding\/[\w.-]+$/.test(trimmed)) {
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
