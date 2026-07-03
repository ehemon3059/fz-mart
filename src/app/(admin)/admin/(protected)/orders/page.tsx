import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { listOrders } from "@/server/orders/admin";
import { getExistingFraudChecksByPhones } from "@/server/fraud";
import { formatTaka } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/config/order-status";
import RiskBadge from "@/components/admin/RiskBadge";
import OrderStatusBadge from "@/components/admin/OrderStatusBadge";
import BulkOrderActions from "./BulkOrderActions";

const FILTERS: Array<OrderStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

function startOfDay(value: string): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(value: string): Date {
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Build a querystring from the active filters, overriding/clearing some keys. */
function buildQuery(
  base: { status?: string; q?: string; from?: string; to?: string },
  overrides: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  const merged = { ...base, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const status = sp.status;
  const q = sp.q?.trim() || undefined;
  const from = sp.from || undefined;
  const to = sp.to || undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const filter = status && status !== "ALL" ? (status as OrderStatus) : undefined;
  const result = await listOrders({
    status: filter,
    search: q,
    from: from ? startOfDay(from) : undefined,
    to: to ? endOfDay(to) : undefined,
    page,
  });

  const riskByPhone = await getExistingFraudChecksByPhones(
    Array.from(new Set(result.orders.map((o) => o.customerPhone))),
  );

  // Common base for links so the active search/date filters survive navigation.
  const base = { status: status ?? undefined, q, from, to };
  const firstOnPage = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const lastOnPage = Math.min(result.page * result.pageSize, result.total);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Orders</h1>

      {/* Search + date range. method=get keeps the URL shareable/bookmarkable. */}
      <form method="get" className="flex flex-wrap items-end gap-3">
        {status && status !== "ALL" && <input type="hidden" name="status" value={status} />}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Order no., name, or phone"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded text-sm font-medium"
        >
          Apply
        </button>
        {(q || from || to) && (
          <Link
            href={`/admin/orders${buildQuery({ status: status ?? undefined }, {})}`}
            className="px-4 py-2 rounded text-sm font-medium text-gray-600 border"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Status filter pills — preserve the active search/date range. */}
      <div className="flex gap-2 text-sm flex-wrap">
        {FILTERS.map((f) => {
          const active = (status ?? "ALL") === f;
          const href = `/admin/orders${buildQuery(base, {
            status: f === "ALL" ? undefined : f,
            page: undefined,
          })}`;
          return (
            <Link
              key={f}
              href={href}
              className={`px-3 py-1 rounded-full border ${
                active ? "bg-black text-white border-black" : "text-gray-700"
              }`}
            >
              {f === "ALL" ? "All" : ORDER_STATUS_LABELS[f]}
            </Link>
          );
        })}
      </div>

      <p className="text-sm text-gray-500">
        {result.total === 0
          ? "No orders found."
          : `Showing ${firstOnPage}–${lastOnPage} of ${result.total} orders`}
      </p>

      <BulkOrderActions>
        <div className="border rounded-lg bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2 w-10">
                  <input
                    type="checkbox"
                    name="selectAll"
                    aria-label="Select all orders on this page"
                    className="align-middle"
                  />
                </th>
                <th className="px-4 py-2">Order No.</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Risk</th>
                <th className="px-4 py-2">Placed</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {result.orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      name="orderId"
                      value={order.id}
                      aria-label={`Select order ${order.orderNo}`}
                      className="align-middle"
                    />
                  </td>
                  <td className="px-4 py-2 font-mono font-medium">{order.orderNo}</td>
                  <td className="px-4 py-2">{order.customerName}</td>
                  <td className="px-4 py-2">{order.customerPhone}</td>
                  <td className="px-4 py-2">{formatTaka(order.total)}</td>
                  <td className="px-4 py-2">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-2">
                    <RiskBadge riskScore={riskByPhone.get(order.customerPhone) ?? null} />
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {order.createdAt.toLocaleDateString("en-BD")}
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/admin/orders/${order.id}`} className="underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {result.orders.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </BulkOrderActions>

      {/* Pagination */}
      {result.pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Link
            href={`/admin/orders${buildQuery(base, { page: String(result.page - 1) })}`}
            aria-disabled={result.page <= 1}
            className={`px-3 py-1.5 rounded border ${
              result.page <= 1
                ? "pointer-events-none opacity-40"
                : "hover:border-black"
            }`}
          >
            ← Previous
          </Link>
          <span className="text-gray-500">
            Page {result.page} of {result.pageCount}
          </span>
          <Link
            href={`/admin/orders${buildQuery(base, { page: String(result.page + 1) })}`}
            aria-disabled={result.page >= result.pageCount}
            className={`px-3 py-1.5 rounded border ${
              result.page >= result.pageCount
                ? "pointer-events-none opacity-40"
                : "hover:border-black"
            }`}
          >
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}
