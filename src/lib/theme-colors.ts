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
    id: "orange",
    name: "Sunset Orange",
    palette: { brand: "#f97316", brandDark: "#c2540f", brandTint: "#fff1e6", brandTint2: "#fbd2ad" },
  },
];

export const DEFAULT_PALETTE: BrandPalette = THEME_PRESETS[0].palette;

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
