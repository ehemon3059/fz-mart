/**
 * Which photos a product actually shows on the storefront.
 *
 * A product's gallery is `ProductImage`, but photos can also live on its
 * variants (`ProductVariant.imageUrl`) and colour swatches
 * (`ProductColor.imageUrl`). Since per-variant photos moved onto the variant row
 * itself, a product can be saved with a full set of option photos and an *empty*
 * gallery — the admin form treats the two uploads as separate. Those products
 * rendered the placeholder on first paint and only revealed a photo once the
 * shopper picked an option, which also poisoned the OG image, the JSON-LD, the
 * cart thumbnail and every listing card.
 *
 * So the gallery falls back to the option photos when it is empty. It is a
 * fallback, not a merge: when an admin has curated a gallery, that is what shows
 * — option photos still swap in on selection via VariantImageContext.
 */

export interface ResolvedImage {
  id: number;
  url: string;
  isPrimary: boolean;
}

interface ProductImageLike {
  id?: number;
  url: string;
  isPrimary?: boolean;
}

interface WithOptionImages {
  images: ProductImageLike[];
  variants?: { imageUrl?: string | null }[];
  colors?: { imageUrl?: string | null }[];
}

/**
 * Gallery photos in display order, primary first. Empty only when the product
 * has no photo anywhere — callers substitute the placeholder themselves.
 *
 * Synthetic ids are negative so they can't collide with real ProductImage ids
 * (React keys in the gallery / thumbnail strip).
 */
export function resolveProductImages(product: WithOptionImages): ResolvedImage[] {
  if (product.images.length > 0) {
    return product.images.map((img, i) => ({
      id: img.id ?? i,
      url: img.url,
      isPrimary: img.isPrimary ?? i === 0,
    }));
  }

  // Variants first (they are the shopper-facing options), then colour swatches.
  // Deduped: rows sharing a colour commonly reuse one photo, and showing it
  // twice in the thumbnail strip looks broken.
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const src of [...(product.variants ?? []), ...(product.colors ?? [])]) {
    const url = src.imageUrl?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }

  return urls.map((url, i) => ({ id: -(i + 1), url, isPrimary: i === 0 }));
}

/** Cover photo for cards, meta tags and cart lines. Null = nothing uploaded. */
export function resolvePrimaryImage(product: WithOptionImages): string | null {
  const images = resolveProductImages(product);
  return images.find((i) => i.isPrimary)?.url ?? images[0]?.url ?? null;
}
