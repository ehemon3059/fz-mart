import { invalidateCache } from "@/lib/cache";

// Cache key scheme for catalog reads, centralized here so invalidation
// (cleared from admin/products/actions.ts on every write) can never drift
// from what the read functions in index.ts actually use.
//
// WHAT CLEARS EACH KEY:
//   product:slug:<slug>            -> editing/deleting that product
//   products:featured              -> any product's isFeatured/status/price/stock change
//   products:category:<slug>       -> any product move/add/remove within that category
//
// A category page lists products from that node AND all descendants, so a
// single product write clears the product's own category slug PLUS every
// ancestor slug (passed in as `categorySlugs`) — see invalidateProductCaches.

export const productCacheKeys = {
  bySlug: (slug: string) => `product:slug:${slug}`,
  featured: () => "products:featured",
  byCategorySlug: (slug: string) => `products:category:${slug}`,
  newArrivals: () => "products:new-arrivals",
  // Order-driven (sums OrderItem quantities), not product-write-driven —
  // relies solely on its own short TTL rather than invalidateProductCaches.
  bestSellers: () => "products:best-sellers",
  related: (productId: number) => `products:related:${productId}`,
};

/**
 * Call this after creating, updating, or deleting a product. Pass the
 * product's CURRENT category slug (+ its ancestor slugs), and — if it just
 * moved categories — the PREVIOUS ones too, so every affected listing's stale
 * entry is cleared as well. `categorySlug`/`previousCategorySlug` are
 * convenience singulars merged into the same set.
 */
export async function invalidateProductCaches(params: {
  productId?: number;
  slug?: string;
  previousSlug?: string;
  categorySlug?: string;
  previousCategorySlug?: string;
  categorySlugs?: string[];
  previousCategorySlugs?: string[];
}): Promise<void> {
  const keys = new Set<string>();
  keys.add(productCacheKeys.featured());

  if (params.slug) keys.add(productCacheKeys.bySlug(params.slug));
  if (params.previousSlug) keys.add(productCacheKeys.bySlug(params.previousSlug));
  if (params.productId) keys.add(productCacheKeys.related(params.productId));

  const catSlugs = [
    ...(params.categorySlug ? [params.categorySlug] : []),
    ...(params.previousCategorySlug ? [params.previousCategorySlug] : []),
    ...(params.categorySlugs ?? []),
    ...(params.previousCategorySlugs ?? []),
  ];
  for (const slug of catSlugs) keys.add(productCacheKeys.byCategorySlug(slug));

  await Promise.all(Array.from(keys).map((key) => invalidateCache(key)));
}
