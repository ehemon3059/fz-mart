import Link from "next/link";
import { getMonthlyFinancialReport } from "@/server/finance/report";
import { formatTaka } from "@/lib/money";
import { EXPENSE_CATEGORY_LABELS } from "@/config/expense-category";
import { Icon } from "@/components/icons";

export const metadata = { title: "Profit & Loss — FZ-Mart Admin" };

// Parse the ?month=YYYY-MM param into a year + 0-based month, defaulting to the
// current month when it's missing or malformed.
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

  const value = `${year}-${String(month + 1).padStart(2, "0")}`;
  return { year, month, value };
}

export default async function FinanceReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const { year, month, value } = resolveMonth(monthParam);
  const report = await getMonthlyFinancialReport(year, month);

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-BD", {
    month: "long",
    year: "numeric",
  });
  const profitable = report.netProfit >= 0;

  // Top summary cards, left → right along the P&L formula.
  const cards = [
    { label: "Net Revenue", value: report.netRevenue, tone: "neutral" as const, sub: "Gross − coupons − returns" },
    { label: "COGS", value: report.cogs, tone: "neutral" as const, sub: "Cost of goods sold" },
    { label: "Gross Profit", value: report.grossProfit, tone: report.grossProfit >= 0 ? "good" : "bad" as const, sub: "Net revenue − COGS" },
    { label: "Total OpEx", value: report.totalOpEx, tone: "neutral" as const, sub: "Operating expenses" },
  ];

  // P&L statement rows. `kind` drives styling: sign = a +/− line item,
  // subtotal = a bold running total, section = a group heading.
  type Row = { label: string; value: number; kind: "add" | "sub" | "subtotal" | "section" };
  const rows: Row[] = [
    { label: "Gross Sales", value: report.grossSales, kind: "add" },
    { label: "Coupon Discounts", value: report.couponDiscounts, kind: "sub" },
    { label: "Returns", value: report.returns, kind: "sub" },
    { label: "Net Revenue", value: report.netRevenue, kind: "subtotal" },
    { label: "Cost of Goods Sold", value: report.cogs, kind: "sub" },
    { label: "Gross Profit", value: report.grossProfit, kind: "subtotal" },
    { label: "Operating Expenses", value: 0, kind: "section" },
    { label: "Outbound Shipping Fees", value: report.outboundShipping, kind: "sub" },
    { label: "Return Shipping Fees", value: report.returnShipping, kind: "sub" },
    { label: "COD / Gateway Fees", value: report.gatewayFees, kind: "sub" },
    { label: "Inventory Loss (damaged returns)", value: report.inventoryLoss, kind: "sub" },
    ...report.manualExpenseBreakdown.map(
      (e): Row => ({ label: EXPENSE_CATEGORY_LABELS[e.category], value: e.amount, kind: "sub" }),
    ),
    { label: "Total Operating Expenses", value: report.totalOpEx, kind: "subtotal" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit &amp; Loss</h1>
          <p className="mt-1 text-sm text-gray-500">
            {monthLabel} · {report.deliveredOrders} delivered / {report.returnedOrders} returned
            {" "}· cached up to 60s
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
            href="/admin/reports/finance/expenses"
            className="flex items-center gap-1.5 rounded border px-4 py-2 text-sm font-medium hover:border-black"
          >
            <Icon name="settings" size={16} /> Manage Expenses
          </Link>
        </div>
      </div>

      {/* Top summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border bg-white p-5">
            <p className="text-sm text-gray-500">{c.label}</p>
            <p
              className={[
                "mt-1 text-2xl font-bold",
                c.tone === "good" ? "text-green-600" : c.tone === "bad" ? "text-red-600" : "text-gray-900",
              ].join(" ")}
            >
              {formatTaka(c.value)}
            </p>
            <p className="mt-1 text-xs text-gray-400">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Net Profit — the headline, its own full-width card with a P/L badge */}
      <div
        className={[
          "flex flex-wrap items-center justify-between gap-4 rounded-lg border-2 bg-white p-6",
          profitable ? "border-green-200" : "border-red-200",
        ].join(" ")}
      >
        <div>
          <p className="text-sm font-medium text-gray-500">Net Profit</p>
          <p
            className={[
              "mt-1 text-4xl font-extrabold tracking-tight",
              profitable ? "text-green-600" : "text-red-600",
            ].join(" ")}
          >
            {formatTaka(report.netProfit)}
          </p>
        </div>
        <span
          className={[
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold",
            profitable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
          ].join(" ")}
        >
          <Icon name={profitable ? "check" : "warn"} size={18} />
          {profitable ? "Profitable month" : "Operating at a loss"}
        </span>
      </div>

      {/* Full breakdown — the P&L statement */}
      <div>
        <h2 className="mb-2 font-semibold text-gray-900">Breakdown</h2>
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {rows.map((row, i) => {
                if (row.kind === "section") {
                  return (
                    <tr key={`${row.label}-${i}`} className="bg-gray-50">
                      <td colSpan={2} className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        {row.label}
                      </td>
                    </tr>
                  );
                }
                const isSubtotal = row.kind === "subtotal";
                const isNegative = row.kind === "sub";
                return (
                  <tr key={`${row.label}-${i}`} className={isSubtotal ? "bg-gray-50/60" : ""}>
                    <td className={["px-4 py-2.5", isSubtotal ? "font-bold text-gray-900" : "text-gray-700"].join(" ")}>
                      {row.label}
                    </td>
                    <td
                      className={[
                        "px-4 py-2.5 text-right tabular-nums",
                        isSubtotal ? "font-bold text-gray-900" : isNegative ? "text-red-600" : "text-gray-900",
                      ].join(" ")}
                    >
                      {isNegative && row.value !== 0 ? "− " : ""}
                      {formatTaka(row.value)}
                    </td>
                  </tr>
                );
              })}
              {/* Net Profit footer row */}
              <tr className={profitable ? "bg-green-50" : "bg-red-50"}>
                <td className="px-4 py-3 text-base font-extrabold text-gray-900">Net Profit</td>
                <td
                  className={[
                    "px-4 py-3 text-right text-base font-extrabold tabular-nums",
                    profitable ? "text-green-700" : "text-red-700",
                  ].join(" ")}
                >
                  {formatTaka(report.netProfit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Sales are recognised on the delivery date and returns on the return date (from the
          order status history), so this reflects money actually realised in {monthLabel}.
        </p>
      </div>
    </div>
  );
}
