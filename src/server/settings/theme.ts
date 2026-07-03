import { getSettingGroup, setSetting } from "@/lib/settings";
import { DEFAULT_PALETTE, type BrandPalette } from "@/lib/theme-colors";

// Storefront brand palette, stored unencrypted in the generic Setting table
// under the "theme" group. Falls back to the default (Pink Purple) until an
// admin saves a choice.

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
