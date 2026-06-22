import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/cache";

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
  categoryName: string;
  subcategoryName: string;
  stock: number;
  status: string;
}

export async function getStockReport(): Promise<StockReportRow[]> {
  return getOrSetCache(CACHE_KEY, TTL_SECONDS, async () => {
    const products = await prisma.product.findMany({
      orderBy: { stock: "asc" },
      include: { subcategory: { include: { category: true } } },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      categoryName: p.subcategory.category.name,
      subcategoryName: p.subcategory.name,
      stock: p.stock,
      status: p.status,
    }));
  });
}
