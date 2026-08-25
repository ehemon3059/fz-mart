import Link from "next/link";
import { listStockTakes } from "@/server/inventory/stocktake";
import { listLocations } from "@/server/inventory/locations";
import { Badge } from "@/components/admin/ui/Badge";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import StartTakeForm from "./StartTakeForm";

export const metadata = { title: "Stock-takes — FZ-Mart Admin" };

const STATUS_TONE = {
  OPEN: "warning",
  COMMITTED: "success",
  CANCELLED: "neutral",
} as const;

export default async function StockTakesPage() {
  const [takes, locations] = await Promise.all([listStockTakes(), listLocations()]);

  return (
    <div className="max-w-4xl space-y-6 px-4 py-8 sm:px-7">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
          Stock-takes
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Count the shelves with a scanner, review every variance together, then apply the lot as
          one recorded act.
        </p>
      </div>

      <StartTakeForm locations={locations.map((l) => ({ id: l.id, name: l.name }))} />

      {takes.length === 0 ? (
        <EmptyState
          icon="box"
          title="No stock-takes yet"
          description="A stock-take is the honest way to correct a count: everything you find, applied together and recorded in the ledger."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Reference</th>
                <th className="px-4 py-3 text-left font-semibold">Location</th>
                <th className="px-4 py-3 text-right font-semibold">Lines</th>
                <th className="px-4 py-3 text-left font-semibold">Started</th>
                <th className="px-4 py-3 text-left font-semibold">By</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {takes.map((t) => (
                <tr key={t.id} className="hover:bg-stone-50/60">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/inventory/stock-takes/${t.id}`}
                      className="font-mono font-medium text-stone-900 hover:text-accent hover:underline"
                    >
                      {t.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {t.location?.name ?? <span className="text-stone-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-stone-500">
                    {t._count.lines}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {t.startedAt.toLocaleDateString("en-BD", { day: "2-digit", month: "short" })}
                  </td>
                  <td className="px-4 py-3 text-stone-500">{t.actorName}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
