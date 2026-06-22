import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/cache";
import type { OrderStatus } from "@prisma/client";

// Cache: 60s TTL per (startDate, endDate) pair — these are heavy aggregation
// queries over potentially the whole orders table. Invalidation rule: same
// as stock report, time-based only; reports tolerate up to 60s staleness,
// unlike checkout/order-detail which always read live.
const TTL_SECONDS = 60;

export interface OrderReportSummary {
  totalOrders: number;
  totalRevenue: number;
  byStatus: Array<{ status: OrderStatus; count: number; total: number }>;
  byDate: Array<{ date: string; count: number; total: number }>;
}

function cacheKey(startDate: string, endDate: string): string {
  return `report:orders:${startDate}:${endDate}`;
}

export async function getOrderReport(
  startDate: Date,
  endDate: Date,
): Promise<OrderReportSummary> {
  const key = cacheKey(startDate.toISOString(), endDate.toISOString());

  return getOrSetCache(key, TTL_SECONDS, async () => {
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { status: true, total: true, createdAt: true },
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

    const statusMap = new Map<OrderStatus, { count: number; total: number }>();
    const dateMap = new Map<string, { count: number; total: number }>();

    for (const order of orders) {
      const statusEntry = statusMap.get(order.status) ?? { count: 0, total: 0 };
      statusEntry.count += 1;
      statusEntry.total += order.total;
      statusMap.set(order.status, statusEntry);

      const dateKey = order.createdAt.toISOString().slice(0, 10);
      const dateEntry = dateMap.get(dateKey) ?? { count: 0, total: 0 };
      dateEntry.count += 1;
      dateEntry.total += order.total;
      dateMap.set(dateKey, dateEntry);
    }

    return {
      totalOrders,
      totalRevenue,
      byStatus: Array.from(statusMap.entries())
        .map(([status, v]) => ({ status, ...v }))
        .sort((a, b) => b.count - a.count),
      byDate: Array.from(dateMap.entries())
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    };
  });
}
