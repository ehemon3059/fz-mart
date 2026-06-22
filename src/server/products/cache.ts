import { invalidateCache } from "@/lib/cache";

// Cache key scheme for catalog reads, centralized here so invalidation
// (cleared from admin/products/actions.ts on every write) can never drift
// from what the read functions in index.ts actually use.
//
// WHAT CLEARS EACH KEY:
//   product:slug:<slug>            -> editing/deleting that product
//   products:featured              -> any product's isFeatured/status/price/stock change
//   products:subcategory:<slug>    -> any product move/add/remove within that subcategory
//   products:category:<slug>       -> any product move/add/remove within that category
//
// A single product edit can touch all four, since a product belongs to one
// subcategory which belongs to one category — see invalidateProductCaches.

export const productCacheKeys = {
  bySlug: (slug: string) => `product:slug:${slug}`,
  featured: () => "products:featured",
  bySubcategorySlug: (slug: string) => `products:subcategory:${slug}`,
  byCategorySlug: (slug: string) => `products:category:${slug}`,
};

/**
 * Call this after creating, updating, or deleting a product. Pass the
 * product's CURRENT subcategory/category slugs, and — if it just moved
 * subcategories — the PREVIOUS ones too, so the old listing's stale entry
 * is cleared as well.
 */
export async function invalidateProductCaches(params: {
  slug?: string;
  previousSlug?: string;
  subcategorySlug?: string;
  previousSubcategorySlug?: string;
  categorySlug?: string;
  previousCategorySlug?: string;
}): Promise<void> {
  const keys = new Set<string>();
  keys.add(productCacheKeys.featured());

  if (params.slug) keys.add(productCacheKeys.bySlug(params.slug));
  if (params.previousSlug) keys.add(productCacheKeys.bySlug(params.previousSlug));

  if (params.subcategorySlug) {
    keys.add(productCacheKeys.bySubcategorySlug(params.subcategorySlug));
  }
  if (params.previousSubcategorySlug) {
    keys.add(productCacheKeys.bySubcategorySlug(params.previousSubcategorySlug));
  }
  if (params.categorySlug) {
    keys.add(productCacheKeys.byCategorySlug(params.categorySlug));
  }
  if (params.previousCategorySlug) {
    keys.add(productCacheKeys.byCategorySlug(params.previousCategorySlug));
  }

  await Promise.all(Array.from(keys).map((key) => invalidateCache(key)));
}
