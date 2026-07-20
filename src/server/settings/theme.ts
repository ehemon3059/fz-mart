import { getSettingGroup, setSetting } from "@/lib/settings";
import {
  DEFAULT_PALETTE,
  coerceLayout,
  type BrandPalette,
  type ThemeLayout,
} from "@/lib/theme-colors";

// Storefront brand palette + surface/layout config, stored unencrypted in the
// generic Setting table under the "theme" group. Falls back to the defaults
// (Pink Purple palette, light theme) until an admin saves a choice.

const GROUP = "theme";

export async function getBrandPalette(): Promise<BrandPalette> {
  const g = await getSettingGroup(GROUP);
  if (!g.brand) return DEFAULT_PALETTE;
  return {
    brand: g.brand,
    brandDark: g.brandDark ?? DEFAULT_PALETTE.brandDark,
    brandTint: g.brandTint ?? DEFAULT_PALETTE.brandTint,
    brandTint2: g.brandTint2 ?? DEFAULT_PALETTE.brandTint2,
  };
}

export async function setBrandPalette(palette: BrandPalette): Promise<void> {
  await Promise.all([
    setSetting({ group: GROUP, key: "brand", value: palette.brand }),
    setSetting({ group: GROUP, key: "brandDark", value: palette.brandDark }),
    setSetting({ group: GROUP, key: "brandTint", value: palette.brandTint }),
    setSetting({ group: GROUP, key: "brandTint2", value: palette.brandTint2 }),
  ]);
}

// ── Surface theme + layout ────────────────────────────────────
// The preset/background/card-style/count keys live in the same "theme" group
// as the palette. coerceLayout validates + clamps the raw strings, so callers
// always get a safe, typed ThemeLayout even when no rows exist.

export async function getThemeLayout(): Promise<ThemeLayout> {
  const g = await getSettingGroup(GROUP);
  return coerceLayout({
    preset: g.preset,
    customBgColor: g.customBgColor,
    productCardStyle: g.productCardStyle,
    homeProductCount: g.homeProductCount,
  });
}

export async function setThemeLayout(input: Partial<ThemeLayout>): Promise<ThemeLayout> {
  const current = await getThemeLayout();
  // Distinguish "field omitted" (undefined → keep current) from an explicit
  // clear (null → drop the override); `?? ""` would wrongly keep the old value.
  const bg = input.customBgColor !== undefined ? input.customBgColor : current.customBgColor;
  // Re-validate the merged result so a partial update can't persist a bad value.
  const next = coerceLayout({
    preset: input.preset ?? current.preset,
    customBgColor: bg ?? "",
    productCardStyle: input.productCardStyle ?? current.productCardStyle,
    homeProductCount: String(input.homeProductCount ?? current.homeProductCount),
  });

  await Promise.all([
    setSetting({ group: GROUP, key: "preset", value: next.preset }),
    setSetting({ group: GROUP, key: "customBgColor", value: next.customBgColor ?? "" }),
    setSetting({ group: GROUP, key: "productCardStyle", value: next.productCardStyle }),
    setSetting({ group: GROUP, key: "homeProductCount", value: String(next.homeProductCount) }),
  ]);
  return next;
}
