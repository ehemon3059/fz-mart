import Link from "next/link";
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
import OrderStatusBadge from "@/components/admin/OrderStatusBadge";
import { KpiCard } from "@/components/admin/ui/Card";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { DataTable, Th, Td, Tr, TableEmpty } from "@/components/admin/ui/DataTable";
import { OrderPipeline, TerminalChips } from "@/components/admin/dashboard/OrderPipeline";
import { Icon } from "@/components/icons";

export default async function AdminDashboardPage() {
  const [stats, lowStock, best7, best30, categorySales, repeat, courier, funnel] = await Promise.all([
    getDashboardStats(),
    getLowStockProducts(),
    getBestSellers(7),
    getBestSellers(30),
    getSalesByCategory(),
    getRepeatCustomerRate(),
    getCourierSuccess(),
    getFunnelReport(30),
  ]);

  const cards = [
    {
      label: "Orders Today",
      value: String(stats.todayCount),
      sub: `${formatTaka(stats.todayRevenue)} today`,
      href: "/admin/orders",
      icon: "cart" as const,
      tone: "accent" as const,
    },
    {
      label: "Pending Orders",
      value: String(stats.pendingCount),
      sub: "Awaiting confirmation",
      href: "/admin/orders?status=PENDING",
      icon: "info" as const,
      tone: "warning" as const,
    },
    {
      label: "Active Products",
      value: String(stats.activeProducts),
      sub: "Currently published",
      href: "/admin/products",
      icon: "box" as const,
      tone: "neutral" as const,
    },
    {
      label: "Delivered Revenue",
      value: formatTaka(stats.deliveredRevenue),
      sub: `${stats.totalOrders} orders all-time`,
      href: "/admin/reports/orders",
      icon: "home" as const,
      tone: "accent" as const,
    },
  ];

  const maxFunnel = Math.max(1, ...funnel.steps.map((s) => s.count));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight text-stone-900">Dashboard</h1>

      {/* Low-stock alert */}
      {lowStock.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning-soft p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-warning/15 text-warning-fg">
              <Icon name="warn" size={15} />
            </span>
            <h2 className="text-sm font-semibold text-warning-fg">
              {lowStock.length} product{lowStock.length === 1 ? "" : "s"} low on stock
            </h2>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {lowStock.slice(0, 12).map((p) => (
              <Link
                key={p.id}
                href={`/admin/products/${p.id}/edit`}
                className="rounded-full border border-warning/30 bg-white px-3 py-1 text-[13px] text-warning-fg transition-colors hover:border-warning"
              >
                {p.name} · <b className="nums">{p.stock}</b> left
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Headline KPIs — primary metric treatment */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <KpiCard
            key={card.label}
            label={card.label}
            value={card.value}
            sub={card.sub}
            href={card.href}
            icon={card.icon}
            tone={card.tone}
          />
        ))}
      </div>

      {/* Order pipeline — signature element */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-stone-900">Order Pipeline</h2>
          <Link href="/admin/orders" className="text-sm text-stone-500 underline-offset-2 hover:text-accent hover:underline">
            All orders
          </Link>
        </div>
        <OrderPipeline counts={stats.statusCounts} />
        <div className="mt-3">
          <TerminalChips counts={stats.statusCounts} statuses={ORDER_TERMINAL} />
        </div>
      </div>

      {/* Conversion funnel — last 30 days, proportional bars */}
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold text-stone-900">Conversion Funnel · last 30 days</h2>
          {funnel.checkoutAbandonmentRate != null && (
            <span className="text-sm text-stone-500">
              Checkout abandonment:{" "}
              <b className={funnel.checkoutAbandonmentRate > 60 ? "text-warning-fg" : "text-stone-700"}>
                {funnel.checkoutAbandonmentRate}%
              </b>
            </span>
          )}
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
          <div className="space-y-3">
            {funnel.steps.map((step) => {
              const pct = Math.round((step.count / maxFunnel) * 100);
              return (
                <div key={step.type}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium text-stone-700">{step.label}</span>
                    <span className="flex items-baseline gap-2">
                      <span className="font-bold text-stone-900 nums">
                        {step.count.toLocaleString("en-BD")}
                      </span>
                      {step.stepRate != null ? (
                        <span className={`text-xs font-medium ${step.stepRate >= 100 ? "text-success-fg" : "text-stone-400"}`}>
                          {step.stepRate}%
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400">top</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-400">
            Server-recorded storefront events (bots and blocked IPs excluded); views are counted once
            per visitor per product per day. Retained for 90 days.
          </p>
        </div>
      </div>

      {/* Recent orders */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-stone-900">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm text-stone-500 underline-offset-2 hover:text-accent hover:underline">
            View all
          </Link>
        </div>
        <DataTable
          head={
            <tr>
              <Th>Order No.</Th>
              <Th>Customer</Th>
              <Th align="right">Total</Th>
              <Th>Status</Th>
              <Th align="right">Placed</Th>
            </tr>
          }
        >
          {stats.recentOrders.map((order) => (
            <Tr key={order.id}>
              <Td className="font-spline-mono font-medium">
                <Link href={`/admin/orders/${order.id}`} className="hover:text-accent hover:underline">
                  {order.orderNo}
                </Link>
              </Td>
              <Td>{order.customerName}</Td>
              <Td numeric className="font-medium text-stone-900">{formatTaka(order.total)}</Td>
              <Td>
                <OrderStatusBadge status={order.status} />
              </Td>
              <Td numeric className="text-stone-500">
                {order.createdAt.toLocaleDateString("en-BD")}
              </Td>
            </Tr>
          ))}
          {stats.recentOrders.length === 0 && (
            <TableEmpty colSpan={5}>No orders yet.</TableEmpty>
          )}
        </DataTable>
      </div>

      {/* Owner analytics */}
      <div>
        <h2 className="mb-3 text-[15px] font-semibold text-stone-900">Insights</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Best sellers 7 / 30 days */}
          {[
            { title: "Best sellers · last 7 days", rows: best7 },
            { title: "Best sellers · last 30 days", rows: best30 },
          ].map((panel) => (
            <div key={panel.title} className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
              <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-stone-500">{panel.title}</h3>
              {panel.rows.length === 0 ? (
                <EmptyState
                  icon="star"
                  title="No delivered sales yet"
                  description="Sales appear here once orders reach Delivered."
                  action={{ label: "View products", href: "/admin/products", icon: "box" }}
                />
              ) : (
                <div className="divide-y divide-stone-100 text-sm">
                  {panel.rows.map((r, i) => (
                    <div key={r.productId} className="flex items-center justify-between py-2">
                      <span className="truncate">
                        <span className="text-stone-400 nums">{i + 1}.</span>{" "}
                        <Link href={`/products/${r.slug}`} className="hover:text-accent hover:underline">{r.name}</Link>
                      </span>
                      <span className="ml-3 shrink-0 text-stone-500 nums">
                        {r.qty} sold · {formatTaka(r.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Sales by category */}
          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-stone-500">Sales by category</h3>
            {categorySales.length === 0 ? (
              <EmptyState
                icon="tag"
                title="No delivered sales yet"
                description="Category revenue builds up as orders are delivered."
              />
            ) : (
              <div className="divide-y divide-stone-100 text-sm">
                {categorySales.map((c) => (
                  <div key={c.category} className="flex items-center justify-between py-2">
                    <span className="text-stone-700">{c.category}</span>
                    <span className="text-stone-500 nums">{formatTaka(c.revenue)} · {c.qty} items</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Repeat customers + courier success */}
          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
            <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-stone-500">Repeat customers</h3>
            <p className="text-3xl font-bold text-stone-900 nums">{repeat.rate}%</p>
            <p className="text-xs text-stone-400">
              {repeat.repeatCustomers} of {repeat.totalCustomers} customers ordered more than once
            </p>

            <h3 className="mb-2 mt-5 text-[13px] font-semibold uppercase tracking-wide text-stone-500">COD delivery success by courier</h3>
            {courier.length === 0 ? (
              <p className="text-sm text-stone-400">No courier shipments yet.</p>
            ) : (
              <div className="divide-y divide-stone-100 text-sm">
                {courier.map((c) => (
                  <div key={c.courier} className="flex items-center justify-between py-2">
                    <span className="text-stone-700">{c.courier}</span>
                    <span className="text-stone-500 nums">
                      <span className={c.successRate >= 80 ? "font-semibold text-success-fg" : "font-semibold text-warning-fg"}>
                        {c.successRate}%
                      </span>{" "}
                      ({c.delivered}✓ / {c.failed}✗)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
