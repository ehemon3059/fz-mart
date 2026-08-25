import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/cache";
import { productCacheKeys } from "./cache";
import { listActiveCategories } from "@/server/categories";
import { collectDescendantIds } from "@/server/categories/tree";

// Service layer for products. Pages/components call these functions, never
// Prisma directly — caching lives here, in one place, so the whole app
// speeds up without page changes. Every cache entry's invalidation rule is
// documented in cache.ts; writes go through server/products/admin.ts, which
// calls invalidateProductCaches() after every create/update/delete.
//
// TTL is short (60s) rather than infinite: it's a safety net in case an
// admin write somehow lands without going through the invalidation path,
// not the primary mechanism for freshness.
const CATALOG_TTL_SECONDS = 60;

const productWithImages = {
  images: { orderBy: { sortOrder: "asc" } },
  // Just enough of each variant to price the card: a variant product's card
  // shows the lowest variant price ("from"), in that variant's own colour.
  // Deliberately narrow — cards render in long lists, so this stays cheap.
  // imageUrl is here for the card thumbnail, not for pricing: a product whose
  // photos were all uploaded per-option has an empty gallery, and the card falls
  // back to these (see resolvePrimaryImage).
  variants: {
    orderBy: { sortOrder: "asc" },
    // stock/reserved are here so a card can judge availability from the
    // options that actually hold the units -- Product.stock is vestigial for a
    // product with variants and goes stale on the first PO receipt.
    select: {
      price: true,
      discountPrice: true,
      priceColor: true,
      imageUrl: true,
      stock: true,
      reserved: true,
    },
  },
  colors: { orderBy: { sortOrder: "asc" }, select: { imageUrl: true } },
  // Lets storefront cards know whether the shopper must pick a variant/color
  // before adding to cart (quick-add) or should be sent to the detail page.
  _count: { select: { variants: true, colors: true } },
} satisfies Prisma.ProductInclude;

const productWithDetails = {
  images: { orderBy: { sortOrder: "asc" } },
  colors: { orderBy: { sortOrder: "asc" } },
  specifications: { orderBy: { sortOrder: "asc" } },
  features: { orderBy: { sortOrder: "asc" } },
  variants: { orderBy: { sortOrder: "asc" } },
  // Collapsible "Features & Specs" panels. Cached with the rest of the product
  // (product:slug:<slug>) and cleared by the same invalidateProductCaches call
  // on every admin write, so an edited accordion shows up immediately.
  accordionSections: { orderBy: { sortOrder: "asc" } },
  // The product's own category node. The full ancestor chain for breadcrumbs +
  // SEO is derived on the page from the cached category tree (ancestorsOf).
  category: true,
} satisfies Prisma.ProductInclude;

export async function getProductBySlug(slug: string) {
  return getOrSetCache(productCacheKeys.bySlug(slug), CATALOG_TTL_SECONDS, () =>
    prisma.product.findUnique({
      where: { slug, status: "ACTIVE" },
      include: productWithDetails,
    }),
  );
}

/** Same category node, excludes the current product — powers "Recommended for you". */
export async function listRelatedProducts(productId: number, categoryId: number, limit = 4) {
  return getOrSetCache(productCacheKeys.related(productId), CATALOG_TTL_SECONDS, () =>
    prisma.product.findMany({
      where: {
        status: "ACTIVE",
        categoryId,
        id: { not: productId },
      },
      include: productWithImages,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: limit,
    }),
  );
}

/**
 * Fresh card data for a list of slugs, in the order given, skipping any that
 * are gone or no longer ACTIVE.
 *
 * Powers "Recently viewed", which remembers slugs in the shopper's browser.
 * That list can outlive the products in it by weeks, so it is never rendered
 * from what the browser stored — a deleted product would show a dead card with
 * a stale price and a link to a 404. Here the database has the final say.
 *
 * Uncached: it is keyed by whatever arbitrary slug set one browser happens to
 * hold, so there is no shared entry worth storing, and it runs once per
 * product-page view against an indexed unique column.
 */
export async function listProductCardsBySlugs(slugs: string[], limit = 12) {
  const wanted = [...new Set(slugs.filter((s) => typeof s === "string" && s))].slice(0, limit);
  if (wanted.length === 0) return [];
  const found = await prisma.product.findMany({
    where: { slug: { in: wanted }, status: "ACTIVE" },
    include: productWithImages,
  });
  // Restore the caller's order — findMany returns rows in the database's order,
  // but the browser's list is most-recently-viewed first and that is the order
  // the shopper expects to see.
  const bySlug = new Map(found.map((p) => [p.slug, p]));
  return wanted.map((s) => bySlug.get(s)).filter((p): p is NonNullable<typeof p> => p != null);
}

export async function listFeaturedProducts(limit = 8) {
  return getOrSetCache(productCacheKeys.featured(), CATALOG_TTL_SECONDS, () =>
    prisma.product.findMany({
      where: { status: "ACTIVE", isFeatured: true },
      include: productWithImages,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  );
}

export async function listNewArrivals(limit = 20) {
  return getOrSetCache(productCacheKeys.newArrivals(), CATALOG_TTL_SECONDS, () =>
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      include: productWithImages,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  );
}

/** Ranked by total quantity sold (all-time). Falls back to newest if no sales yet. */
export async function listBestSellers(limit = 20) {
  return getOrSetCache(productCacheKeys.bestSellers(), CATALOG_TTL_SECONDS, async () => {
    const ranked = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: { productId: { not: null } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    });

    const ids = ranked.map((r) => r.productId).filter((id): id is number => id != null);
    if (ids.length === 0) {
      return prisma.product.findMany({
        where: { status: "ACTIVE" },
        include: productWithImages,
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: ids }, status: "ACTIVE" },
      include: productWithImages,
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    // Re-apply the sales-ranked order (findMany with `in` doesn't preserve it).
    return ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => p != null);
  });
}

export type ProductSort = "new" | "bestsellers" | "featured";

/** Generic catalog listing for the /products page, sorted by the given mode. */
export async function listProducts(sort: ProductSort = "new", limit = 60) {
  if (sort === "bestsellers") return listBestSellers(limit);
  if (sort === "featured") return listFeaturedProducts(limit);
  return listNewArrivals(limit);
}

/**
 * Products in a category AND all of its descendants — so a shopper viewing a
 * parent node sees everything beneath it, not just items pinned directly to it.
 * Descendant ids come from the cached tree (collectDescendantIds).
 */
export async function listProductsByCategorySlug(categorySlug: string) {
  return getOrSetCache(
    productCacheKeys.byCategorySlug(categorySlug),
    CATALOG_TTL_SECONDS,
    async () => {
      const cats = await listActiveCategories();
      const node = cats.find((c) => c.slug === categorySlug);
      if (!node) return [];
      const ids = collectDescendantIds(node.id, cats);
      return prisma.product.findMany({
        where: { status: "ACTIVE", categoryId: { in: ids } },
        include: productWithImages,
        orderBy: { createdAt: "desc" },
      });
    },
  );
}

// Keyword/filtered search moved to server/products/search.ts in Phase 2 —
// it uses the MySQL FULLTEXT index for relevance ranking plus the full
// filter/sort matrix, which this simple `contains` scan couldn't express.

export type ProductWithImages = Awaited<ReturnType<typeof listFeaturedProducts>>[number];

export type ProductWithDetails = NonNullable<
  Awaited<ReturnType<typeof getProductBySlug>>
>;
