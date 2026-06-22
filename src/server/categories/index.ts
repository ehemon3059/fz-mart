import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/cache";
import { categoryCacheKeys } from "./cache";

// Read constantly (every page's nav), changes rarely — a good cache
// candidate. Invalidation rule lives in cache.ts; admin writes call
// invalidateCategoryCaches() after every create/update/delete.
const CATALOG_TTL_SECONDS = 60;

export async function listActiveCategories() {
  return getOrSetCache(categoryCacheKeys.active(), CATALOG_TTL_SECONDS, () =>
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
  );
}

export async function getCategoryBySlug(slug: string) {
  return getOrSetCache(categoryCacheKeys.bySlug(slug), CATALOG_TTL_SECONDS, () =>
    prisma.category.findUnique({
      where: { slug, isActive: true },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
  );
}
