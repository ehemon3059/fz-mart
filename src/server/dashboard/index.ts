import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface DashboardStats {
  todayCount: number;
  todayRevenue: number;
  pendingCount: number;
  activeProducts: number;
  totalOrders: number;
  /** Realized revenue from delivered orders, all-time. */
  deliveredRevenue: number;
  statusCounts: Record<OrderStatus, number>;
  recentOrders: Array<{
    id: number;
    orderNo: string;
    customerName: string;
    total: number;
    status: OrderStatus;
    createdAt: Date;
  }>;
}

const ALL_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** One round-trip of small aggregate queries for the admin landing page. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const todayStart = startOfToday();

  const [statusGroups, activeProducts, todayAgg, deliveredAgg, recentOrders] =
    await Promise.all([
      prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.product.count({ where: { status: "ACTIVE" } }),
      prisma.order.aggregate({
        where: { createdAt: { gte: todayStart } },
        _count: { _all: true },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { status: "DELIVERED" },
        _sum: { total: true },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          orderNo: true,
          customerName: true,
          total: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

  const statusCounts = Object.fromEntries(
    ALL_STATUSES.map((s) => [s, 0]),
  ) as Record<OrderStatus, number>;
  let totalOrders = 0;
  for (const group of statusGroups) {
    statusCounts[group.status] = group._count._all;
    totalOrders += group._count._all;
  }

  return {
    todayCount: todayAgg._count._all,
    todayRevenue: todayAgg._sum.total ?? 0,
    pendingCount: statusCounts.PENDING,
    activeProducts,
    totalOrders,
    deliveredRevenue: deliveredAgg._sum.total ?? 0,
    statusCounts,
    recentOrders,
  };
}
