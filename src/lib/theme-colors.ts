// Storefront brand palette — the 4 CSS variables that drive every accent in
// the `.fz` design system (buttons, badges, links, focus rings, tints).
//
// Admins pick a palette in Settings → Appearance. They can choose one of the
// presets below, or pick ANY custom colour — in which case the three companion
// shades are derived from the base so the whole system stays cohesive.

export interface BrandPalette {
  brand: string;
  brandDark: string;
  brandTint: string;
  brandTint2: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  palette: BrandPalette;
  /**
   * When true, the storefront renders primary brand buttons/badges with a
   * glossy brand→white gradient that darkens on hover (see the
   * `.fz[data-brand-gloss="on"]` rules in styles/storefront.css). Flat solid
   * fills are used for every other preset.
   */
  gloss?: boolean;
}

// Hand-tuned presets. The first (Pink Purple) is the project default.
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "fuchsia",
    name: "Pink Purple",
    palette: { brand: "#c026d3", brandDark: "#a21caf", brandTint: "#fbe9fe", brandTint2: "#f3c4f9" },
  },
  {
    id: "emerald",
    name: "Emerald",
    palette: { brand: "#0d9f6e", brandDark: "#0a7d57", brandTint: "#e6f6ef", brandTint2: "#b9e6d3" },
  },
  {
    id: "blue",
    name: "Royal Blue",
    palette: { brand: "#2f6bdb", brandDark: "#1f4fb0", brandTint: "#e8eefc", brandTint2: "#c2d4f7" },
  },
  {
    id: "golden",
    name: "Golden Elegance",
    palette: { brand: "#caa14b", brandDark: "#96721f", brandTint: "#fdf8ec", brandTint2: "#f3e3b8" },
    gloss: true,
  },
];

export const DEFAULT_PALETTE: BrandPalette = THEME_PRESETS[0].palette;

/** True when two palettes are the exact same four hex values. */
function palettesEqual(a: BrandPalette, b: BrandPalette): boolean {
  return (
    a.brand === b.brand &&
    a.brandDark === b.brandDark &&
    a.brandTint === b.brandTint &&
    a.brandTint2 === b.brandTint2
  );
}

/**
 * True when the saved palette matches a preset flagged `gloss` (Golden
 * Elegance). The storefront can't see the preset id — only the four hex
 * values — so it re-derives the glossy flag by matching the palette here.
 */
export function isGlossyPalette(p: BrandPalette): boolean {
  return THEME_PRESETS.some((preset) => preset.gloss === true && palettesEqual(preset.palette, p));
}

const HEX6 = /^#?[0-9a-fA-F]{6}$/;
const HEX3 = /^#?[0-9a-fA-F]{3}$/;

export function isValidHexColor(value: string): boolean {
  return HEX6.test(value) || HEX3.test(value);
}

/** Normalise to lowercase 6-digit `#rrggbb`. Returns null when not a hex. */
export function normalizeHex(value: string): string | null {
  if (!isValidHexColor(value)) return null;
  let h = value.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return `#${h.toLowerCase()}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = (normalizeHex(hex) ?? "#000000").slice(1);
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mix two colours in sRGB: `weightA` of `a`, the rest of `b`. */
function mix(a: string, b: string, weightA: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const w = Math.max(0, Math.min(1, weightA));
  return rgbToHex(ar * w + br * (1 - w), ag * w + bg * (1 - w), ab * w + bb * (1 - w));
}

/**
 * Build a full palette from a single base colour — used when an admin picks a
 * custom colour. Companions are derived so contrast and tint feel consistent
 * with the presets.
 */
export function derivePalette(base: string): BrandPalette {
  const brand = normalizeHex(base) ?? DEFAULT_PALETTE.brand;
  return {
    brand,
    brandDark: mix(brand, "#000000", 0.82),
    brandTint: mix(brand, "#ffffff", 0.1),
    brandTint2: mix(brand, "#ffffff", 0.28),
  };
}

// ─────────────────────────────────────────────────────────────
// Surface theme + layout
//
// Separate from the brand palette (which drives accents). These control the
// page background / card / text "surface" and a few layout knobs the admin
// can tune from Settings → Appearance. Values are stored as rows in the same
// generic `theme` Setting group — see server/settings/theme.ts.
// ─────────────────────────────────────────────────────────────

export const SURFACE_PRESETS = ["theme-light", "theme-dark", "theme-ocean", "theme-golden"] as const;
export type SurfacePreset = (typeof SURFACE_PRESETS)[number];

export const CARD_STYLES = ["modern", "classic", "minimal"] as const;
export type CardStyle = (typeof CARD_STYLES)[number];

/** Bounds for the home-page product count (clamped server-side). */
export const HOME_PRODUCT_MIN = 1;
export const HOME_PRODUCT_MAX = 48;

/**
 * The CSS-variable set each surface preset overrides on the `.fz` wrapper.
 * Keys mirror the base variables declared in styles/storefront.css so the
 * whole storefront re-themes without touching any component.
 */
export interface SurfaceVars {
  bg: string;
  card: string;
  ink: string;
  inkSoft: string;
  inkMute: string;
  line: string;
}

export const SURFACE_PRESET_VARS: Record<SurfacePreset, SurfaceVars> = {
  // Light is the storefront's original look — keep these in sync with the
  // defaults in styles/storefront.css.
  "theme-light":  { bg: "#fafaf9", card: "#ffffff", ink: "#23211e", inkSoft: "#5c5852", inkMute: "#8a857d", line: "#ecebe8" },
  "theme-dark":   { bg: "#0b1220", card: "#111827", ink: "#e5e7eb", inkSoft: "#9ca3af", inkMute: "#6b7280", line: "#1f2937" },
  "theme-ocean":  { bg: "#f0f9ff", card: "#ffffff", ink: "#0c2740", inkSoft: "#33617f", inkMute: "#6b93ad", line: "#cfeafe" },
  // Golden — warm cream surface with gold-brown text, matching the Golden UI
  // Kit. Pairs with the "Golden Elegance" brand palette for the full glossy
  // look (glossy gold buttons come from `.fz[data-brand-gloss="on"]`). The page
  // itself gets a subtle cream gradient via `.fz[data-surface="theme-golden"]`.
  "theme-golden": { bg: "#faf3df", card: "#fffdf7", ink: "#3d3418", inkSoft: "#8a7a52", inkMute: "#a99a6c", line: "#ece0bd" },
};

/** Human labels for the admin picker. */
export const SURFACE_PRESET_LABELS: Record<SurfacePreset, string> = {
  "theme-light": "Light",
  "theme-dark": "Dark",
  "theme-ocean": "Ocean",
  "theme-golden": "Golden",
};

export const CARD_STYLE_LABELS: Record<CardStyle, string> = {
  modern: "Modern",
  classic: "Classic",
  minimal: "Minimal",
};

export interface ThemeLayout {
  preset: SurfacePreset;
  /** Optional page-background override (#rrggbb) that wins over the preset. */
  customBgColor: string | null;
  productCardStyle: CardStyle;
  homeProductCount: number;
}

export const DEFAULT_LAYOUT: ThemeLayout = {
  preset: "theme-light",
  customBgColor: null,
  productCardStyle: "modern",
  homeProductCount: 10,
};

/**
 * Validate + clamp the raw string values read from the `theme` Setting group
 * into a typed, safe ThemeLayout. Anything invalid falls back to the default,
 * so a malformed row can never break rendering.
 */
export function coerceLayout(raw: Record<string, string | undefined>): ThemeLayout {
  const count = parseInt(raw.homeProductCount ?? "", 10);
  const bg = normalizeHex(raw.customBgColor ?? "");
  // The retired "theme-forest" preset was replaced by "theme-golden"; migrate
  // any stored value so an existing selection keeps rendering.
  const rawPreset = raw.preset === "theme-forest" ? "theme-golden" : raw.preset;
  return {
    preset: (SURFACE_PRESETS as readonly string[]).includes(rawPreset ?? "")
      ? (rawPreset as SurfacePreset)
      : DEFAULT_LAYOUT.preset,
    customBgColor: bg,
    productCardStyle: (CARD_STYLES as readonly string[]).includes(raw.productCardStyle ?? "")
      ? (raw.productCardStyle as CardStyle)
      : DEFAULT_LAYOUT.productCardStyle,
    homeProductCount: Number.isFinite(count)
      ? Math.min(HOME_PRODUCT_MAX, Math.max(HOME_PRODUCT_MIN, count))
      : DEFAULT_LAYOUT.homeProductCount,
  };
}
