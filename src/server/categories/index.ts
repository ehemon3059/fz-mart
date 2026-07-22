import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/cache";
import { categoryCacheKeys } from "./cache";
import { keepReachable } from "./tree";

// Read constantly (every page's nav), changes rarely — a good cache
// candidate. Invalidation rule lives in cache.ts; admin writes call
// invalidateCategoryCaches() after every create/update/delete.
const CATALOG_TTL_SECONDS = 60;

/**
 * Every active, REACHABLE category as a FLAT list. Deactivating a parent hides
 * its whole subtree: a node survives only if every ancestor is also active
 * (keepReachable drops the rest), so active children of an inactive parent
 * never leak into the nav as orphan roots. Callers assemble the tree / collect
 * descendants / walk ancestors with the helpers in ./tree.ts.
 */
export async function listActiveCategories() {
  return getOrSetCache(categoryCacheKeys.active(), CATALOG_TTL_SECONDS, async () => {
    const active = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return keepReachable(active);
  });
}

/**
 * Resolve a slug to a storefront-visible category. Sourced from the
 * active+reachable set (not a bare findUnique), so a node is returned only when
 * its WHOLE ancestor chain is active — hiding a parent hides every descendant's
 * page too, not just the parent's. Returns null for hidden/unreachable slugs.
 */
export async function getCategoryBySlug(slug: string) {
  const cats = await listActiveCategories();
  return cats.find((c) => c.slug === slug) ?? null;
}

export type ActiveCategory = Awaited<ReturnType<typeof listActiveCategories>>[number];
