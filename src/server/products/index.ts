import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/cache";
import { productCacheKeys } from "./cache";

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
} satisfies Prisma.ProductInclude;

export async function getProductBySlug(slug: string) {
  return getOrSetCache(productCacheKeys.bySlug(slug), CATALOG_TTL_SECONDS, () =>
    prisma.product.findUnique({
      where: { slug, status: "ACTIVE" },
      include: productWithImages,
    }),
  );
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

export async function listProductsBySubcategorySlug(subcategorySlug: string) {
  return getOrSetCache(
    productCacheKeys.bySubcategorySlug(subcategorySlug),
    CATALOG_TTL_SECONDS,
    () =>
      prisma.product.findMany({
        where: {
          status: "ACTIVE",
          subcategory: { slug: subcategorySlug, isActive: true },
        },
        include: productWithImages,
        orderBy: { createdAt: "desc" },
      }),
  );
}

export async function listProductsByCategorySlug(categorySlug: string) {
  return getOrSetCache(
    productCacheKeys.byCategorySlug(categorySlug),
    CATALOG_TTL_SECONDS,
    () =>
      prisma.product.findMany({
        where: {
          status: "ACTIVE",
          subcategory: { isActive: true, category: { slug: categorySlug, isActive: true } },
        },
        include: productWithImages,
        orderBy: { createdAt: "desc" },
      }),
  );
}

export type ProductWithImages = NonNullable<
  Awaited<ReturnType<typeof getProductBySlug>>
>;
