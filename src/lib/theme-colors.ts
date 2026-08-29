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

/** WCAG relative luminance (0 = black, 1 = white). */
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours (1 = identical, 21 = black/white). */
function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * A readable text colour for `bg`. Prefers a tinted tone — a much darker or
 * lighter shade of the background itself, so the text stays in the same colour
 * family — but only if it clears WCAG AA (4.5:1). Mid-tone backgrounds can't
 * produce a tinted ink with enough contrast, so those fall back to plain
 * near-black or white, whichever reads better.
 */
function readableInk(bg: string): string {
  const candidates = [
    luminance(bg) > 0.35 ? mix(bg, "#000000", 0.42) : mix(bg, "#ffffff", 0.34),
    "#111111",
    "#ffffff",
  ];
  return (
    candidates.find((c) => contrast(bg, c) >= 4.5) ??
    candidates.reduce((best, c) => (contrast(bg, c) > contrast(bg, best) ? c : best))
  );
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
// Per-element colour overrides
//
// The brand palette drives every accent at once. These six named slots let an
// admin re-colour individual pieces of the storefront on top of it. Each is
// OPTIONAL: null means "follow the brand palette", which is what the CSS
// fallbacks in styles/storefront.css express (e.g. `var(--btn-primary,
// var(--brand))`). Stored as hex strings in the same `theme` Setting group.
// ─────────────────────────────────────────────────────────────

/** Masthead colour when the admin hasn't overridden it — matches storefront.css. */
export const NAV_BG_DEFAULT = "#0d0625";

/** Utility-bar text colour when unset — white, as storefront.css has it. */
export const UTIL_INK_DEFAULT = "#ffffff";

/** Footer colour when unset — the card surface, as storefront.css has it. */
export const FOOTER_BG_DEFAULT = "#ffffff";

/** Footer text when unset — the ink derived from the default white footer. */
export const FOOTER_INK_DEFAULT = "#23211e";

export interface ElementColorSlot {
  key: string;
  /** Name shown in Settings → Appearance. */
  label: string;
  /** What it repaints on the storefront. */
  help: string;
  /** Which palette value it falls back to when unset — for the admin preview. */
  fallback: (p: BrandPalette) => string;
}

export const ELEMENT_COLOR_SLOTS = [
  {
    key: "headerBg",
    label: "Header background",
    help: "Main masthead bar — logo, search and cart row.",
    fallback: () => NAV_BG_DEFAULT,
  },
  {
    key: "utilBg",
    label: "Top bar background",
    help: "Thin strip above the header (Track Order / Help Center).",
    fallback: () => NAV_BG_DEFAULT,
  },
  {
    key: "utilInk",
    label: "Top bar text",
    help: "All text in the thin top strip — the delivery note on the left and the language switcher, Track Order and Help Center links on the right.",
    fallback: () => UTIL_INK_DEFAULT,
  },
  {
    key: "btnPrimary",
    label: "Primary button",
    help: "Add to cart, Place order, newsletter and other solid CTAs. The hover shade is derived automatically.",
    fallback: (p) => p.brand,
  },
  {
    key: "badgeNew",
    label: "NEW badge",
    help: "The NEW flag on product cards.",
    fallback: (p) => p.brand,
  },
  {
    key: "chipBg",
    label: "Info chip",
    help: "Soft tinted chips such as Free shipping and section eyebrows. Text colour is derived automatically.",
    fallback: (p) => p.brandTint,
  },
  {
    key: "linkAccent",
    label: "Accent link",
    help: "Text links like “Shop now →” and View all.",
    fallback: (p) => p.brandDark,
  },
  {
    key: "mobileSearchBg",
    label: "Mobile search band",
    help: "Mobile only — the band behind the full-width search row under the logo.",
    fallback: (p) => p.brand,
  },
  {
    key: "mobileSearchBtn",
    label: "Mobile search button",
    help: "Mobile only — the round search icon button inside the search pill. The hover shade is derived automatically.",
    fallback: (p) => p.brand,
  },
  {
    key: "mobileTabBg",
    label: "Mobile bottom bar",
    help: "Mobile only — the fixed Home / Menu / Cart / Account tab bar. Its top border is derived automatically.",
    fallback: (p) => p.brand,
  },
  {
    key: "footerBg",
    label: "Footer background",
    help: "The whole footer block. Headings, links, borders and payment chips re-colour automatically to stay readable — including on a dark footer.",
    fallback: () => FOOTER_BG_DEFAULT,
  },
  {
    key: "footerInk",
    label: "Footer text",
    help: "All footer text in one colour — the brand blurb, contact rows and their icons, column headings and every footer link. Leave empty to derive it from the footer background automatically.",
    fallback: () => FOOTER_INK_DEFAULT,
  },
] as const satisfies readonly ElementColorSlot[];

export type ElementColorKey = (typeof ELEMENT_COLOR_SLOTS)[number]["key"];

/** null = inherit from the brand palette. */
export type ElementColors = Record<ElementColorKey, string | null>;

export const DEFAULT_ELEMENT_COLORS: ElementColors = {
  headerBg: null,
  utilBg: null,
  utilInk: null,
  btnPrimary: null,
  badgeNew: null,
  chipBg: null,
  linkAccent: null,
  mobileSearchBg: null,
  mobileSearchBtn: null,
  mobileTabBg: null,
  footerBg: null,
  footerInk: null,
};

/**
 * The footer is a whole surface, not a single accent, so one picked colour has
 * to yield a readable set: heading, body/link, hairline border and the payment
 * chip fill. Everything is mixed FROM the chosen background, so the result
 * stays in its colour family, and the direction flips on dark backgrounds —
 * otherwise a navy footer would keep near-black text.
 */
/**
 * A tinted tone of `bg` at `weight`, but only if it clears `minRatio`. Mid-tone
 * backgrounds can't produce a readable tint in either direction (measured: a
 * #0770b0 footer gave 2.8:1 body text), so those fall back to plain white or
 * near-black — whichever contrasts better.
 */
function readableOn(bg: string, weight: number, minRatio: number): string {
  const toward = luminance(bg) < 0.35 ? "#ffffff" : "#000000";
  const tinted = mix(bg, toward, weight);
  if (contrast(bg, tinted) >= minRatio) return tinted;
  return contrast(bg, "#ffffff") >= contrast(bg, "#111111") ? "#ffffff" : "#111111";
}

function footerVars(bg: string): Record<string, string> {
  const dark = luminance(bg) < 0.35;
  const toward = dark ? "#ffffff" : "#000000";
  return {
    "--footer-bg": bg,
    // Headings: near the contrasting end, with a trace of the bg hue. Held to
    // 7:1 (WCAG AAA) since they anchor the whole block.
    "--footer-ink": readableOn(bg, 0.1, 7),
    // Body copy and links — AA at 4.5:1.
    "--footer-soft": readableOn(bg, 0.42, 4.5),
    // Hairlines and chip fills are decorative, so they stay pure mixes: they
    // only need to be *distinguishable* from the surface, not readable.
    "--footer-line": mix(bg, toward, 0.86),
    "--footer-chip": mix(bg, toward, 0.94),
  };
}

/**
 * The stylesheet's own `--nav-bg` default (see `:root` in storefront.css).
 * Kept here so the theme-color meta tag can resolve the same value the CSS
 * would land on when an admin has set no override at all — if you change it in
 * one place, change it in the other.
 */
export const DEFAULT_NAV_BG = "#0d0625";

/**
 * The colour actually painted behind the utility bar at the top of the page,
 * resolved the same way the browser resolves `var(--util-bg, var(--nav-bg))`
 * in `.fz .util`: the utility-bar override wins, then the header override,
 * then the stylesheet default.
 *
 * This is what the mobile URL bar should match, so it backs the `theme-color`
 * meta tag. Returning a plain hex (never a `var()`) matters — `theme-color`
 * is parsed by the browser chrome, which does not resolve custom properties.
 */
export function resolveTopBarColor(c: ElementColors): string {
  return c.utilBg || c.headerBg || DEFAULT_NAV_BG;
}

/** Validate raw setting rows into a typed override map; junk becomes null. */
export function coerceElementColors(raw: Record<string, string | undefined>): ElementColors {
  const out = { ...DEFAULT_ELEMENT_COLORS };
  for (const slot of ELEMENT_COLOR_SLOTS) {
    out[slot.key] = normalizeHex(raw[slot.key] ?? "");
  }
  return out;
}

/**
 * The CSS custom properties to set on the `.fz` wrapper for the overrides that
 * are actually present. Unset slots emit nothing, so the `var(--x, …)`
 * fallbacks in the stylesheet keep tracking the brand palette.
 *
 * Two slots expand into a second variable, because one admin-picked colour has
 * to carry a companion shade: the primary button needs a darker hover, and the
 * tinted chip needs readable text on top of it.
 */
export function elementColorVars(c: ElementColors): Record<string, string> {
  const vars: Record<string, string> = {};
  if (c.headerBg) vars["--nav-bg"] = c.headerBg;
  if (c.utilBg) vars["--util-bg"] = c.utilBg;
  if (c.utilInk) vars["--util-ink"] = c.utilInk;
  if (c.btnPrimary) {
    vars["--btn-primary"] = c.btnPrimary;
    vars["--btn-primary-dark"] = mix(c.btnPrimary, "#000000", 0.82);
  }
  if (c.badgeNew) vars["--badge-new"] = c.badgeNew;
  if (c.chipBg) {
    vars["--chip-bg"] = c.chipBg;
    vars["--chip-ink"] = readableInk(c.chipBg);
  }
  if (c.linkAccent) vars["--link-accent"] = c.linkAccent;
  if (c.mobileSearchBg) vars["--msearch-bg"] = c.mobileSearchBg;
  if (c.mobileSearchBtn) {
    vars["--msearch-btn"] = c.mobileSearchBtn;
    vars["--msearch-btn-dark"] = mix(c.mobileSearchBtn, "#000000", 0.82);
  }
  if (c.mobileTabBg) {
    vars["--mtab-bg"] = c.mobileTabBg;
    // The bar's top hairline and the cart-badge ring both sit on this fill, so
    // they track it instead of the brand palette.
    vars["--mtab-line"] = mix(c.mobileTabBg, "#000000", 0.82);
  }
  if (c.footerBg) Object.assign(vars, footerVars(c.footerBg));
  // A picked footer text colour flattens the derived heading/body pair into one
  // ink, so every string in the footer renders in exactly that colour. Applied
  // after footerVars so it wins over the shades derived from the background.
  if (c.footerInk) {
    vars["--footer-ink"] = c.footerInk;
    vars["--footer-soft"] = c.footerInk;
  }
  return vars;
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

/**
 * Optional per-surface background overrides, layered on top of the preset.
 * Each is null = "follow the preset", matching the `var(--x, …)` fallbacks in
 * storefront.css. Keyed by the CSS class the admin sees in the picker.
 */
export const SURFACE_COLOR_SLOTS = [
  {
    key: "catnavBg",
    label: "Category bar",
    help: "The sticky category strip under the header (.catnav).",
    cssVar: "--catnav-bg",
    fallback: (s: SurfaceVars) => s.card,
  },
  {
    key: "cardBg",
    label: "Product card",
    help: "Every product card surface across the storefront (.card).",
    cssVar: "--card",
    fallback: (s: SurfaceVars) => s.card,
  },
  {
    key: "trustBg",
    label: "Trust bar",
    help: "The badge row under the hero — free delivery, returns, support (.trust-grid).",
    cssVar: "--trust-bg",
    fallback: (s: SurfaceVars) => s.card,
  },
  {
    key: "newsBg",
    label: "Newsletter block",
    help: "The subscribe band near the footer (.news). Its text re-colours automatically to stay readable.",
    cssVar: "--news-bg",
    fallback: (s: SurfaceVars) => s.ink,
  },
] as const;

export type SurfaceColorKey = (typeof SURFACE_COLOR_SLOTS)[number]["key"];
export type SurfaceColors = Record<SurfaceColorKey, string | null>;

export const DEFAULT_SURFACE_COLORS: SurfaceColors = {
  catnavBg: null,
  cardBg: null,
  trustBg: null,
  newsBg: null,
};

export interface ThemeLayout {
  preset: SurfacePreset;
  /** Optional page-background override (#rrggbb) that wins over the preset. */
  customBgColor: string | null;
  /** Optional per-surface background overrides that win over the preset. */
  surfaceColors: SurfaceColors;
  productCardStyle: CardStyle;
  homeProductCount: number;
}

export const DEFAULT_LAYOUT: ThemeLayout = {
  preset: "theme-light",
  customBgColor: null,
  surfaceColors: DEFAULT_SURFACE_COLORS,
  productCardStyle: "modern",
  homeProductCount: 10,
};

/**
 * The CSS custom properties for the surface overrides that are actually set.
 * The newsletter block is a whole surface rather than an accent, so its picked
 * background also yields readable heading and body ink — otherwise choosing a
 * pale colour would leave white-on-white text.
 */
export function surfaceColorVars(c: SurfaceColors): Record<string, string> {
  const vars: Record<string, string> = {};
  if (c.catnavBg) vars["--catnav-bg"] = c.catnavBg;
  if (c.cardBg) vars["--card"] = c.cardBg;
  if (c.trustBg) vars["--trust-bg"] = c.trustBg;
  if (c.newsBg) {
    vars["--news-bg"] = c.newsBg;
    vars["--news-ink"] = readableOn(c.newsBg, 0.06, 7);
    vars["--news-soft"] = readableOn(c.newsBg, 0.38, 4.5);
  }
  return vars;
}

/** Validate raw setting rows into a typed surface-override map; junk becomes null. */
export function coerceSurfaceColors(raw: Record<string, string | undefined>): SurfaceColors {
  const out = { ...DEFAULT_SURFACE_COLORS };
  for (const slot of SURFACE_COLOR_SLOTS) {
    out[slot.key] = normalizeHex(raw[slot.key] ?? "");
  }
  return out;
}

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
    surfaceColors: coerceSurfaceColors(raw),
    productCardStyle: (CARD_STYLES as readonly string[]).includes(raw.productCardStyle ?? "")
      ? (raw.productCardStyle as CardStyle)
      : DEFAULT_LAYOUT.productCardStyle,
    homeProductCount: Number.isFinite(count)
      ? Math.min(HOME_PRODUCT_MAX, Math.max(HOME_PRODUCT_MIN, count))
      : DEFAULT_LAYOUT.homeProductCount,
  };
}
