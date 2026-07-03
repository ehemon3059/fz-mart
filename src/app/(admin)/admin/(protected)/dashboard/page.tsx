import Link from "next/link";
import { getDashboardStats } from "@/server/dashboard";
import { getLowStockProducts } from "@/server/inventory";
import {
  getBestSellers,
  getSalesByCategory,
  getRepeatCustomerRate,
  getCourierSuccess,
} from "@/server/analytics";
import { formatTaka } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/config/order-status";
import OrderStatusBadge from "@/components/admin/OrderStatusBadge";

export default async function AdminDashboardPage() {
  const [stats, lowStock, best7, best30, categorySales, repeat, courier] = await Promise.all([
    getDashboardStats(),
    getLowStockProducts(),
    getBestSellers(7),
    getBestSellers(30),
    getSalesByCategory(),
    getRepeatCustomerRate(),
    getCourierSuccess(),
  ]);

  const cards = [
    {
      label: "Orders Today",
      value: String(stats.todayCount),
      sub: `${formatTaka(stats.todayRevenue)} today`,
      href: "/admin/orders",
    },
    {
      label: "Pending Orders",
      value: String(stats.pendingCount),
      sub: "Awaiting confirmation",
      href: "/admin/orders?status=PENDING",
    },
    {
      label: "Active Products",
      value: String(stats.activeProducts),
      sub: "Currently published",
      href: "/admin/products",
    },
    {
      label: "Delivered Revenue",
      value: formatTaka(stats.deliveredRevenue),
      sub: `${stats.totalOrders} orders all-time`,
      href: "/admin/reports/orders",
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Low-stock alert */}
      {lowStock.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-amber-800">
              ⚠ {lowStock.length} product{lowStock.length === 1 ? "" : "s"} low on stock
            </h2>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {lowStock.slice(0, 12).map((p) => (
              <Link
                key={p.id}
                href={`/admin/products/${p.id}/edit`}
                className="rounded-full border border-amber-300 bg-white px-3 py-1 text-[13px] text-amber-800 hover:border-amber-500"
              >
                {p.name} · <b>{p.stock}</b> left
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Headline metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="border rounded-lg bg-white p-5 hover:border-black transition-colors"
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-3xl font-bold mt-1">{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </Link>
        ))}
      </div>

      {/* Orders by status */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Orders by Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(stats.statusCounts).map(([status, count]) => (
            <Link
              key={status}
              href={`/admin/orders?status=${status}`}
              className="border rounded-lg bg-white p-4 text-center hover:border-black transition-colors"
            >
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-gray-500 mt-1">
                {ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS]}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm underline text-gray-600">
            View all
          </Link>
        </div>
        <div className="border rounded-lg bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Order No.</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono font-medium">
                    <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                      {order.orderNo}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{order.customerName}</td>
                  <td className="px-4 py-2">{formatTaka(order.total)}</td>
                  <td className="px-4 py-2">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {order.createdAt.toLocaleDateString("en-BD")}
                  </td>
                </tr>
              ))}
              {stats.recentOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Owner analytics */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Insights</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Best sellers 7 / 30 days */}
          {[
            { title: "Best sellers · last 7 days", rows: best7 },
            { title: "Best sellers · last 30 days", rows: best30 },
          ].map((panel) => (
            <div key={panel.title} className="rounded-lg border bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">{panel.title}</h3>
              {panel.rows.length === 0 ? (
                <p className="text-sm text-gray-400">No delivered sales yet.</p>
              ) : (
                <div className="divide-y text-sm">
                  {panel.rows.map((r, i) => (
                    <div key={r.productId} className="flex items-center justify-between py-2">
                      <span className="truncate">
                        <span className="text-gray-400">{i + 1}.</span>{" "}
                        <Link href={`/products/${r.slug}`} className="hover:underline">{r.name}</Link>
                      </span>
                      <span className="ml-3 shrink-0 text-gray-500">
                        {r.qty} sold · {formatTaka(r.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Sales by category */}
          <div className="rounded-lg border bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Sales by category</h3>
            {categorySales.length === 0 ? (
              <p className="text-sm text-gray-400">No delivered sales yet.</p>
            ) : (
              <div className="divide-y text-sm">
                {categorySales.map((c) => (
                  <div key={c.category} className="flex items-center justify-between py-2">
                    <span>{c.category}</span>
                    <span className="text-gray-500">{formatTaka(c.revenue)} · {c.qty} items</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Repeat customers + courier success */}
          <div className="rounded-lg border bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Repeat customers</h3>
            <p className="text-3xl font-bold">{repeat.rate}%</p>
            <p className="text-xs text-gray-400">
              {repeat.repeatCustomers} of {repeat.totalCustomers} customers ordered more than once
            </p>

            <h3 className="mb-2 mt-5 text-sm font-semibold text-gray-700">COD delivery success by courier</h3>
            {courier.length === 0 ? (
              <p className="text-sm text-gray-400">No courier shipments yet.</p>
            ) : (
              <div className="divide-y text-sm">
                {courier.map((c) => (
                  <div key={c.courier} className="flex items-center justify-between py-2">
                    <span>{c.courier}</span>
                    <span className="text-gray-500">
                      <span className={c.successRate >= 80 ? "font-semibold text-green-600" : "font-semibold text-amber-600"}>
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
