import { getDeliveryReport } from "@/server/reports/delivery";
import { formatTaka } from "@/lib/money";

export const metadata = { title: "Delivery Performance — FZ-Mart Admin" };

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export default async function DeliveryReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;

  // Default to the last ~6 months so a monthly table has several rows.
  const endDate = to ? endOfDay(new Date(to)) : endOfDay(new Date());
  const startDate = from
    ? startOfDay(new Date(from))
    : startOfDay(new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1));

  const rows = await getDeliveryReport(startDate, endDate);

  const fromValue = startDate.toISOString().slice(0, 10);
  const toValue = endDate.toISOString().slice(0, 10);

  // Totals across the whole window (weighted where it matters).
  const totalDelivered = rows.reduce((s, r) => s + r.delivered, 0);
  const totalShipped = rows.reduce((s, r) => s + r.shipped, 0);
  const totalFailed = rows.reduce((s, r) => s + r.failed, 0);
  const overallFailureRate =
    totalShipped > 0 ? Math.round((totalFailed / totalShipped) * 1000) / 10 : 0;

  const fmtDays = (d: number | null) => (d == null ? "—" : `${d.toFixed(1)} d`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Performance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Speed and reliability per courier, by month. Bucketed on the delivery / return date,
            so counts reconcile with Reports → Orders for the same window.
          </p>
        </div>
        <p className="shrink-0 text-xs text-gray-400">Cached for up to 60 seconds</p>
      </div>

      <form className="flex items-end gap-3" method="get">
        <div>
          <label className="mb-1 block text-sm font-medium">From</label>
          <input type="date" name="from" defaultValue={fromValue} className="rounded border px-3 py-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">To</label>
          <input type="date" name="to" defaultValue={toValue} className="rounded border px-3 py-2" />
        </div>
        <button type="submit" className="rounded bg-black px-4 py-2 font-medium text-white">
          Apply
        </button>
      </form>

      {/* Window summary */}
      <div className="grid max-w-2xl grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Delivered</p>
          <p className="text-2xl font-bold tabular-nums">{totalDelivered}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Shipped</p>
          <p className="text-2xl font-bold tabular-nums">{totalShipped}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Failure Rate</p>
          <p
            className={[
              "text-2xl font-bold tabular-nums",
              overallFailureRate > 15 ? "text-red-600" : overallFailureRate > 7 ? "text-amber-600" : "text-green-600",
            ].join(" ")}
          >
            {overallFailureRate}%
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-semibold text-gray-900">By Courier · Month</h2>
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Month</th>
                <th className="px-4 py-2">Courier</th>
                <th className="px-4 py-2 text-right">Delivered</th>
                <th className="px-4 py-2 text-right">Shipped</th>
                <th className="px-4 py-2 text-right">Failure %</th>
                <th className="px-4 py-2 text-right">Avg days</th>
                <th className="px-4 py-2 text-right">p90 days</th>
                <th className="px-4 py-2 text-right">Avg shipping cost</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={`${r.month}-${r.courier}`} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 tabular-nums text-gray-600">{r.month}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{r.courier}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.delivered}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{r.shipped}</td>
                  <td
                    className={[
                      "px-4 py-2.5 text-right font-semibold tabular-nums",
                      r.failureRate > 15 ? "text-red-600" : r.failureRate > 7 ? "text-amber-600" : "text-green-600",
                    ].join(" ")}
                  >
                    {r.failureRate}%
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmtDays(r.avgDaysToDeliver)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmtDays(r.p90DaysToDeliver)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                    {r.avgShippingCost == null ? "—" : formatTaka(r.avgShippingCost)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    No courier shipments delivered or returned in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Days-to-deliver is measured from the first SHIPPED status (or consignment creation if an
          order was never explicitly marked shipped) to the first DELIVERED status. Failure rate =
          returned/cancelled after shipping ÷ shipped, per courier per month.
        </p>
      </div>
    </div>
  );
}
