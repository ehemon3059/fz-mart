import { getOrderReport } from "@/server/reports/orders";
import { formatTaka } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/config/order-status";

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

export default async function OrderReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;

  const endDate = to ? endOfDay(new Date(to)) : endOfDay(new Date());
  const startDate = from
    ? startOfDay(new Date(from))
    : startOfDay(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));

  const report = await getOrderReport(startDate, endDate);

  const fromValue = startDate.toISOString().slice(0, 10);
  const toValue = endDate.toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Order Reports</h1>
        <p className="text-xs text-gray-400">Cached for up to 60 seconds</p>
      </div>

      <form className="flex items-end gap-3" method="get">
        <div>
          <label className="block text-sm font-medium mb-1">From</label>
          <input
            type="date"
            name="from"
            defaultValue={fromValue}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">To</label>
          <input
            type="date"
            name="to"
            defaultValue={toValue}
            className="border rounded px-3 py-2"
          />
        </div>
        <button type="submit" className="bg-black text-white px-4 py-2 rounded font-medium">
          Apply
        </button>
      </form>

      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="border rounded-lg bg-white p-4">
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="text-2xl font-bold">{report.totalOrders}</p>
        </div>
        <div className="border rounded-lg bg-white p-4">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold">{formatTaka(report.totalRevenue)}</p>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-gray-900 mb-2">By Status</h2>
        <div className="border rounded-lg bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Count</th>
                <th className="px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {report.byStatus.map((row) => (
                <tr key={row.status}>
                  <td className="px-4 py-2">{ORDER_STATUS_LABELS[row.status]}</td>
                  <td className="px-4 py-2">{row.count}</td>
                  <td className="px-4 py-2">{formatTaka(row.total)}</td>
                </tr>
              ))}
              {report.byStatus.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                    No orders in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-gray-900 mb-2">By Date</h2>
        <div className="border rounded-lg bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Count</th>
                <th className="px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {report.byDate.map((row) => (
                <tr key={row.date}>
                  <td className="px-4 py-2">{row.date}</td>
                  <td className="px-4 py-2">{row.count}</td>
                  <td className="px-4 py-2">{formatTaka(row.total)}</td>
                </tr>
              ))}
              {report.byDate.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                    No orders in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
