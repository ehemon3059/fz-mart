import Link from "next/link";
import { getCashFlowReport } from "@/server/finance/cashflow";
import { getMonthlyFinancialReport, monthRange } from "@/server/finance/report";
import { formatTaka } from "@/lib/money";

export const metadata = { title: "Cash Flow — FZ-Mart Admin" };

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

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const { year, month, value } = resolveMonth(monthParam);
  const { start, end } = monthRange(year, month);

  // The P&L alongside it, because the interesting fact about cash flow is
  // usually how far it diverges from profit — and why.
  const [cash, pnl] = await Promise.all([
    getCashFlowReport(start, end),
    getMonthlyFinancialReport(year, month),
  ]);

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-BD", {
    month: "long",
    year: "numeric",
  });

  const positive = cash.net >= 0;
  const gap = cash.net - pnl.netProfit;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash Flow</h1>
          <p className="mt-1 text-sm text-gray-500">{monthLabel} · money in and out, by the day it moved</p>
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

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200 sm:grid-cols-3">
        <div className="bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-stone-500">Money in</p>
          <p className="nums text-lg font-bold text-success-fg">{formatTaka(cash.totalIn)}</p>
        </div>
        <div className="bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-stone-500">Money out</p>
          <p className="nums text-lg font-bold text-stone-900">{formatTaka(cash.totalOut)}</p>
        </div>
        <div className="bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-stone-500">Net movement</p>
          <p
            className={[
              "nums text-lg font-bold",
              positive ? "text-success-fg" : "text-danger-fg",
            ].join(" ")}
          >
            {formatTaka(cash.net)}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {[
          { title: "Money in", lines: cash.inflows, total: cash.totalIn },
          { title: "Money out", lines: cash.outflows, total: cash.totalOut },
        ].map((section) => (
          <div
            key={section.title}
            className="rounded-lg border border-stone-200 bg-white p-5 shadow-card"
          >
            <h2 className="text-[13px] font-semibold text-stone-900">{section.title}</h2>
            <ul className="mt-3 divide-y divide-stone-100">
              {section.lines.map((l) => (
                <li key={l.label} className="flex items-baseline justify-between gap-3 py-2.5">
                  <span className="text-[13px] text-stone-700">
                    {l.label}
                    {l.note && <span className="block text-[11.5px] text-stone-400">{l.note}</span>}
                  </span>
                  <span className="nums text-[13.5px] font-medium text-stone-900">
                    {formatTaka(l.amount)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-baseline justify-between border-t-2 border-stone-200 pt-2.5">
              <span className="text-[13px] font-semibold text-stone-900">Total</span>
              <span className="nums text-[15px] font-bold text-stone-900">
                {formatTaka(section.total)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* The comparison is the point of having both reports. */}
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
        <h2 className="text-[13px] font-semibold text-stone-900">Cash vs. profit</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-stone-500">Net profit (P&amp;L)</p>
            <p className="nums text-[15px] font-bold text-stone-900">{formatTaka(pnl.netProfit)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-stone-500">Net cash</p>
            <p className="nums text-[15px] font-bold text-stone-900">{formatTaka(cash.net)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-stone-500">Difference</p>
            <p className="nums text-[15px] font-bold text-stone-900">{formatTaka(gap)}</p>
          </div>
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-stone-600">
          These two are <strong>meant</strong> to differ. Profit counts goods as a cost when they
          are <em>sold</em>; cash counts money on the day it <em>moves</em>. Paying a supplier for
          next season shows here as cash out but as no cost at all until those goods sell — which
          is exactly how a profitable month can still leave you short.
        </p>
      </div>

      <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-[12.5px] leading-relaxed text-stone-600">
        <p className="font-semibold text-stone-700">One caveat worth knowing</p>
        <p className="mt-1">
          Couriers usually hand over cash-on-delivery money <em>net</em> of their own charge, so
          &ldquo;COD collected&rdquo; and &ldquo;Courier charges&rdquo; often move as a single
          settlement rather than two. The net figure is right either way; the two gross figures are
          each a little overstated.
        </p>
      </div>
    </div>
  );
}
