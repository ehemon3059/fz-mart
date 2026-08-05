// Department illustrations that ship with the storefront, living in
// /public/categories/<slug>.svg. The set is listed rather than read from disk so
// it resolves in any runtime (including edge) with no fs access, and so a
// missing file is a visible fallback rather than a broken image.
//
// Keyed by CATEGORY SLUG: an admin renaming a category keeps its art as long as
// the slug is unchanged. A category with no entry here renders the inline
// keyword icon instead — see CategoryTiles.
const CATEGORY_ART = new Set<string>([
  "baby-items",
  "bags",
  "bathroom-counter-storage",
  "beauty",
  "bedding-accessories",
  "electronics",
  "eyewear",
  "gadgets",
  "gifts-craft",
  "groceries",
  "health",
  "home-decoration",
  "home-life-style",
  "jewelry",
  "kitchen-accessories",
  "mens-boys-fashion",
  "mens-wear",
  "mother-baby",
  "shoes",
  "tools-hardware",
  "toys",
  "watches",
  "women-wear",
  "womens-girls-fashion",
]);

/** Public path to a category's illustration, or null when it has none. */
export function categoryArt(slug: string): string | null {
  return CATEGORY_ART.has(slug) ? `/categories/${slug}.svg` : null;
}
