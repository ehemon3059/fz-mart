"use server";

import { listProductCardsBySlugs } from "@/server/products";
import type { ProductCardData } from "@/components/storefront/ProductCard";

/**
 * Resolve the shopper's "Recently viewed" slugs into current card data.
 *
 * The browser remembers WHICH products were viewed; the server decides what
 * they look like now. Anything deleted, unpublished or renamed simply does not
 * come back, which is what stops a wiped catalogue from lingering in shoppers'
 * browsers as dead cards with stale prices.
 *
 * No auth: this reads public catalogue data only, and the slugs come from the
 * caller's own browsing history. The input is capped server-side so a crafted
 * request can't turn it into a bulk catalogue dump.
 */
export async function resolveRecentlyViewed(slugs: string[]): Promise<ProductCardData[]> {
  if (!Array.isArray(slugs)) return [];
  const products = await listProductCardsBySlugs(slugs, 12);
  return products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    discountPrice: p.discountPrice,
    stock: p.stock,
    promoBadge: p.promoBadge,
    priceColor: p.priceColor,
    images: p.images.map((img) => ({ url: img.url, isPrimary: img.isPrimary })),
    variants: p.variants.map((v) => ({
      price: v.price,
      discountPrice: v.discountPrice,
      priceColor: v.priceColor,
      imageUrl: v.imageUrl,
    })),
    colors: p.colors.map((c) => ({ imageUrl: c.imageUrl })),
    _count: p._count,
  }));
}
