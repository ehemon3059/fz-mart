import Link from "next/link";
import { listCancelledOrders } from "@/server/orders/admin";
import { formatTaka } from "@/lib/money";

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
  base: { q?: string; from?: string; to?: string },
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

export default async function CancelledOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const from = sp.from || undefined;
  const to = sp.to || undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const result = await listCancelledOrders({
    search: q,
    from: from ? startOfDay(from) : undefined,
    to: to ? endOfDay(to) : undefined,
    page,
  });

  const base = { q, from, to };
  const firstOnPage = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const lastOnPage = Math.min(result.page * result.pageSize, result.total);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cancelled Orders</h1>
          <p className="text-sm text-gray-500">
            Orders customers cancelled, with the reason they gave.
          </p>
        </div>
        <Link href="/admin/orders" className="text-sm text-gray-600 underline">
          ← All orders
        </Link>
      </div>

      {/* Search + cancellation-date range. method=get keeps the URL shareable. */}
      <form method="get" className="flex flex-wrap items-end gap-3">
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
          <label className="block text-xs font-medium text-gray-500 mb-1">Cancelled from</label>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Cancelled to</label>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" className="bg-black text-white px-4 py-2 rounded text-sm font-medium">
          Apply
        </button>
        {(q || from || to) && (
          <Link
            href="/admin/orders/cancelled"
            className="px-4 py-2 rounded text-sm font-medium text-gray-600 border"
          >
            Clear
          </Link>
        )}
      </form>

      <p className="text-sm text-gray-500">
        {result.total === 0
          ? "No cancelled orders found."
          : `Showing ${firstOnPage}–${lastOnPage} of ${result.total} cancelled orders`}
      </p>

      <div className="border rounded-lg bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Order No.</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Address</th>
              <th className="px-4 py-2">Account</th>
              <th className="px-4 py-2">Reason</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Cancelled</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {result.rows.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="px-4 py-3 font-mono font-medium">{row.orderNo}</td>
                <td className="px-4 py-3">{row.customerName}</td>
                <td className="px-4 py-3">{row.customerPhone}</td>
                <td className="px-4 py-3 max-w-[220px] text-gray-600">{row.address}</td>
                <td className="px-4 py-3">
                  {row.loggedIn ? (
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                      Logged in
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      Guest
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 max-w-[220px] text-gray-600">
                  {row.reason ? (
                    <span className="italic">“{row.reason}”</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                  {row.cancelledBy && row.cancelledBy !== "customer" && (
                    <span className="mt-0.5 block text-[11px] not-italic text-gray-400">
                      by {row.cancelledBy}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{formatTaka(row.total)}</td>
                <td className="px-4 py-3 text-gray-500">
                  {row.cancelledAt.toLocaleString("en-BD")}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${row.id}`} className="underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {result.rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  No cancelled orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {result.pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Link
            href={`/admin/orders/cancelled${buildQuery(base, { page: String(result.page - 1) })}`}
            aria-disabled={result.page <= 1}
            className={`px-3 py-1.5 rounded border ${
              result.page <= 1 ? "pointer-events-none opacity-40" : "hover:border-black"
            }`}
          >
            ← Previous
          </Link>
          <span className="text-gray-500">
            Page {result.page} of {result.pageCount}
          </span>
          <Link
            href={`/admin/orders/cancelled${buildQuery(base, { page: String(result.page + 1) })}`}
            aria-disabled={result.page >= result.pageCount}
            className={`px-3 py-1.5 rounded border ${
              result.page >= result.pageCount ? "pointer-events-none opacity-40" : "hover:border-black"
            }`}
          >
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}
