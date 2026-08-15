import { getDashboardStats } from "@/server/dashboard";
import { getLowStockProducts } from "@/server/inventory";
import {
  getBestSellers,
  getSalesByCategory,
  getRepeatCustomerRate,
  getCourierSuccess,
} from "@/server/analytics";
import { getFunnelReport } from "@/server/funnel/report";
import { formatTaka } from "@/lib/money";
import { ORDER_TERMINAL } from "@/config/order-status";
import DashboardClient from "./DashboardClient";

export default async function AdminDashboardPage() {
  const [stats, lowStock, best7, best30, categorySales, repeat, courier, funnel] =
    await Promise.all([
      getDashboardStats(),
      getLowStockProducts(),
      getBestSellers(7),
      getBestSellers(30),
      getSalesByCategory(),
      getRepeatCustomerRate(),
      getCourierSuccess(),
      getFunnelReport(30),
    ]);

  // Money and dates are formatted here so the client component receives plain
  // strings — no Date crosses the boundary, and currency formatting stays in
  // one place.
  return (
    <DashboardClient
      data={{
        lowStock: lowStock.map((p) => ({ id: p.id, name: p.name, stock: p.stock })),
        kpis: {
          todayCount: String(stats.todayCount),
          todayRevenue: formatTaka(stats.todayRevenue),
          pendingCount: String(stats.pendingCount),
          activeProducts: String(stats.activeProducts),
          deliveredRevenue: formatTaka(stats.deliveredRevenue),
          totalOrders: stats.totalOrders,
        },
        statusCounts: stats.statusCounts,
        terminalStatuses: ORDER_TERMINAL,
        funnel: {
          steps: funnel.steps.map((s) => ({
            type: s.type,
            label: s.label,
            count: s.count,
            stepRate: s.stepRate,
          })),
          checkoutAbandonmentRate: funnel.checkoutAbandonmentRate,
        },
        recentOrders: stats.recentOrders.map((o) => ({
          id: o.id,
          orderNo: o.orderNo,
          customerName: o.customerName,
          total: formatTaka(o.total),
          status: o.status,
          placed: o.createdAt.toLocaleDateString("en-BD"),
        })),
        best7: best7.map((r) => ({
          productId: r.productId,
          slug: r.slug,
          name: r.name,
          qty: r.qty,
          revenue: formatTaka(r.revenue),
        })),
        best30: best30.map((r) => ({
          productId: r.productId,
          slug: r.slug,
          name: r.name,
          qty: r.qty,
          revenue: formatTaka(r.revenue),
        })),
        categorySales: categorySales.map((c) => ({
          category: c.category,
          revenue: formatTaka(c.revenue),
          qty: c.qty,
        })),
        repeat: {
          rate: repeat.rate,
          repeatCustomers: repeat.repeatCustomers,
          totalCustomers: repeat.totalCustomers,
        },
        courier: courier.map((c) => ({
          courier: c.courier,
          successRate: c.successRate,
          delivered: c.delivered,
          failed: c.failed,
        })),
      }}
    />
  );
}
