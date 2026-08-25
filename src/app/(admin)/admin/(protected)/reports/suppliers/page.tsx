import Link from "next/link";
import { getSupplierProfitReport } from "@/server/finance/supplier-profit";
import { monthRange } from "@/server/finance/report";
import { formatTaka } from "@/lib/money";

export const metadata = { title: "Profit by Supplier — FZ-Mart Admin" };

/** ?month=YYYY-MM → year + 0-based month, defaulting to the current month. */
function resolveMonth(raw?: string): { year: number; month: number; value: string } {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();

  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number);
    if (m >= 1 && m <= 12) {
      year = y;
      month = m - 1;
    }
  }

  return { year, month, value: `${year}-${String(month + 1).padStart(2, "0")}` };
}

export default async function SupplierProfitPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const { year, month, value } = resolveMonth(monthParam);
  const { start, end } = monthRange(year, month);
  const report = await getSupplierProfitReport(start, end);

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-BD", {
    month: "long",
    year: "numeric",
  });

  const totalMargin =
    report.totals.revenue > 0
      ? Math.round((report.totals.grossProfit / report.totals.revenue) * 100)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit by Supplier</h1>
          <p className="mt-1 text-sm text-gray-500">
            {monthLabel} · {report.totals.unitsSold.toLocaleString("en-BD")} unit(s) sold
          </p>
        </div>
        <div className="flex items-end gap-3">
          <form method="get" className="flex items-end gap-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Month</label>
              <input
                type="month"
                name="month"
                defaultValue={value}
                className="rounded border px-3 py-2"
              />
            </div>
            <button type="submit" className="rounded bg-black px-4 py-2 font-medium text-white">
              View
            </button>
          </form>
          <Link
            href="/admin/reports/finance"
            className="rounded border px-4 py-2 text-sm font-medium hover:border-black"
          >
            Profit &amp; Loss
          </Link>
        </div>
      </div>

      {report.rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-10 text-center text-sm text-stone-500">
          Nothing was delivered in {monthLabel}.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200 sm:grid-cols-4">
            {[
              { label: "Revenue", value: formatTaka(report.totals.revenue) },
              { label: "Cost of goods", value: formatTaka(report.totals.cogs) },
              { label: "Gross profit", value: formatTaka(report.totals.grossProfit) },
              { label: "Margin", value: totalMargin == null ? "—" : `${totalMargin}%` },
            ].map((c) => (
              <div key={c.label} className="bg-white px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-stone-500">{c.label}</p>
                <p className="nums text-lg font-bold text-stone-900">{c.value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-card">
            <table className="w-full min-w-[42rem] text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Supplier</th>
                  <th className="px-4 py-3 text-right font-semibold">Products</th>
                  <th className="px-4 py-3 text-right font-semibold">Units</th>
                  <th className="px-4 py-3 text-right font-semibold">Revenue</th>
                  <th className="px-4 py-3 text-right font-semibold">Cost</th>
                  <th className="px-4 py-3 text-right font-semibold">Gross profit</th>
                  <th className="px-4 py-3 text-right font-semibold">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {report.rows.map((r) => (
                  <tr key={r.supplierId ?? "none"} className="hover:bg-stone-50/60">
                    <td className="px-4 py-3">
                      {r.supplierId != null ? (
                        <Link
                          href={`/admin/inventory/suppliers/${r.supplierId}/edit`}
                          className="font-medium text-stone-900 hover:text-accent hover:underline"
                        >
                          {r.supplierName}
                        </Link>
                      ) : (
                        <span className="text-stone-500 italic">{r.supplierName}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-stone-500">
                      {r.productCount}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-stone-500">
                      {r.unitsSold}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatTaka(r.revenue)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-stone-500">
                      {formatTaka(r.cogs)}
                    </td>
                    <td
                      className={[
                        "px-4 py-3 text-right font-semibold tabular-nums",
                        r.grossProfit >= 0 ? "text-success-fg" : "text-danger-fg",
                      ].join(" ")}
                    >
                      {formatTaka(r.grossProfit)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-stone-500">
                      {r.marginPct == null ? "—" : `${r.marginPct}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-[12.5px] leading-relaxed text-stone-600">
        <p className="font-semibold text-stone-700">How a product is tied to a supplier</p>
        <p className="mt-1">
          By the most recent purchase order it was <strong>received</strong> against. A product
          bought from more than one supplier counts entirely towards the latest, so treat these as
          a strong guide rather than an exact split.
        </p>
        {report.hasUnattributed && (
          <p className="mt-1.5">
            Products never received against a purchase order — anything from before you started
            recording them, or stock entered by hand — are grouped under{" "}
            <em>Not linked to a supplier</em> rather than dropped, so these totals still reconcile
            with Profit &amp; Loss.
          </p>
        )}
      </div>
    </div>
  );
}
