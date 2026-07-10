import Link from "next/link";
import { listAdSpendInRange } from "@/server/finance/ad-spend";
import { monthRange } from "@/server/finance/report";
import { formatTaka } from "@/lib/money";
import { AD_CHANNEL_LABELS } from "@/config/ad-channel";
import { Icon } from "@/components/icons";
import DeleteButton from "@/components/admin/DeleteButton";
import { removeAdSpend } from "./actions";

export const metadata = { title: "Ad Spend — FZ-Mart Admin" };

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

export default async function AdSpendPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const { year, month, value } = resolveMonth(monthParam);
  const { start, end } = monthRange(year, month);
  const entries = await listAdSpendInRange(start, end);

  const total = entries.reduce((s, e) => s + e.amount, 0);
  const monthLabel = start.toLocaleDateString("en-BD", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/reports/finance" className="text-sm text-gray-500 hover:underline">
            ← Back to P&amp;L
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Ad Spend</h1>
          <p className="mt-1 text-sm text-gray-500">
            Marketing spend by channel for {monthLabel} — {formatTaka(total)} across {entries.length} entries.
            Drives ROAS &amp; CAC on the P&amp;L.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <form method="get" className="flex items-end gap-2">
            <input type="month" name="month" defaultValue={value} className="rounded border px-3 py-2" />
            <button type="submit" className="rounded bg-black px-4 py-2 font-medium text-white">
              View
            </button>
          </form>
          <Link
            href="/admin/reports/finance/ad-spend/new"
            className="flex items-center gap-1.5 rounded bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Icon name="plus" size={16} /> New Spend
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Channel</th>
              <th className="px-4 py-2">Note</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-500">{e.spentOn.toLocaleDateString("en-BD")}</td>
                <td className="px-4 py-2">
                  <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                    {AD_CHANNEL_LABELS[e.channel]}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-700">{e.note ?? "—"}</td>
                <td className="px-4 py-2 text-right font-medium tabular-nums">{formatTaka(e.amount)}</td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/admin/reports/finance/ad-spend/${e.id}/edit`}
                      className="text-gray-500 hover:text-gray-900"
                      aria-label="Edit"
                    >
                      <Icon name="pencil" size={16} />
                    </Link>
                    <DeleteButton action={removeAdSpend} id={e.id} label="ad spend entry" />
                  </div>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  No ad spend recorded for {monthLabel}.
                </td>
              </tr>
            )}
          </tbody>
          {entries.length > 0 && (
            <tfoot>
              <tr className="border-t bg-gray-50 font-bold">
                <td colSpan={3} className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatTaka(total)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
