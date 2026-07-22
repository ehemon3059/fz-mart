import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/cache";
import { ancestorsOf } from "@/server/categories/tree";

// Cache: 60s TTL, read-only view over product data that changes relatively
// often (every order decrements stock). Short TTL because stale stock counts
// directly mislead restocking decisions — invalidation rule is simply "wait
// up to 60s", no explicit clear needed since admins don't need second-level
// freshness for a report (unlike checkout, which always reads live).
const CACHE_KEY = "report:stock";
const TTL_SECONDS = 60;

export interface StockReportRow {
  id: number;
  name: string;
  /** Full category breadcrumb, e.g. "Electronics › Network › Routers". */
  categoryPath: string;
  stock: number;
  status: string;
}

export async function getStockReport(): Promise<StockReportRow[]> {
  return getOrSetCache(CACHE_KEY, TTL_SECONDS, async () => {
    const [products, cats] = await Promise.all([
      prisma.product.findMany({ orderBy: { stock: "asc" }, include: { category: true } }),
      prisma.category.findMany({ select: { id: true, parentId: true, name: true } }),
    ]);

    return products.map((p) => {
      const path = [...ancestorsOf(p.categoryId, cats).map((c) => c.name), p.category.name];
      return {
        id: p.id,
        name: p.name,
        categoryPath: path.join(" › "),
        stock: p.stock,
        status: p.status,
      };
    });
  });
}
