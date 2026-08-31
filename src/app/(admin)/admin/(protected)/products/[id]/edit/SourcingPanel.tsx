import Link from "next/link";
import { formatTaka } from "@/lib/money";

// Where this product's goods came from, and what they cost.
//
// Read-only on purpose. A supplier is a property of a PURCHASE, not of a
// product — the same shirt can be bought from two suppliers at two prices, and
// this shop's data already shows exactly that. So there is nothing to edit
// here: the panel reports the most recent purchase behind the product and
// leaves recording new ones to the purchase-order flow, which is the only place
// that can capture cost, quantity and freight together.

export interface SourcingView {
  supplierName: string;
  poNo: string;
  poId: number;
  on: string;
  isBackfill: boolean;
  landedCost: number;
}

export default function SourcingPanel({
  sourcing,
  purchased,
  incoming,
  sellPrice,
  productId,
}: {
  sourcing: SourcingView | null;
  purchased: number;
  incoming: number;
  /** Paisa a customer actually pays today, for the margin line. */
  sellPrice: number;
  productId: number;
}) {
  // Margin against the LANDED cost — freight included — because that is what
  // the shop actually paid to put the unit on the shelf. Measuring against the
  // supplier price alone reads high by exactly the freight.
  const cost = sourcing?.landedCost ?? 0;
  const profit = sellPrice - cost;
  const marginPct = sellPrice > 0 && cost > 0 ? Math.round((profit / sellPrice) * 100) : null;

  if (!sourcing) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
        <h2 className="font-semibold text-amber-900">No purchase on record</h2>
        <p className="mt-1 text-[13px] text-amber-900/80">
          Nothing says where these goods came from, so there is no cost to measure profit against.
          Record the purchase and this fills in.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/admin/inventory/purchase-orders/new"
            className="rounded-lg bg-stone-800 px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-stone-900"
          >
            Order from a supplier
          </Link>
          <Link
            href={`/admin/inventory/buy-sell?product=${productId}`}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-amber-900 transition hover:bg-amber-50"
          >
            Already bought it — record it
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-gray-900">Where these came from</h2>
        <Link
          href={`/admin/inventory/purchase-orders/${sourcing.poId}`}
          className="text-[12.5px] font-semibold text-stone-500 underline-offset-2 hover:text-accent hover:underline"
        >
          {sourcing.poNo} →
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Supplier
          </div>
          <div className="truncate text-[15px] font-bold text-stone-900">{sourcing.supplierName}</div>
          <div className="text-[11px] text-stone-400">{sourcing.on}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Landed cost
          </div>
          <div className="text-[15px] font-bold tabular-nums text-stone-900">{formatTaka(cost)}</div>
          <div className="text-[11px] text-stone-400">
            {sourcing.isBackfill ? "recalled, not captured" : "incl. freight"}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Purchased
          </div>
          <div className="text-[15px] font-bold tabular-nums text-stone-900">{purchased}</div>
          <div className="text-[11px] text-stone-400">
            {incoming > 0 ? `${incoming} still incoming` : "all time"}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Profit / unit
          </div>
          <div
            className={`text-[15px] font-bold tabular-nums ${
              profit > 0 ? "text-emerald-700" : profit < 0 ? "text-red-600" : "text-stone-900"
            }`}
          >
            {sellPrice > 0 ? formatTaka(profit) : "—"}
          </div>
          <div className="text-[11px] text-stone-400">
            {marginPct != null ? `${marginPct}% margin` : "set a price"}
          </div>
        </div>
      </div>

      {sellPrice > 0 && cost > 0 && profit <= 0 && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
          This product sells at or below what it cost to buy — every sale loses money.
        </p>
      )}
      {sourcing.isBackfill && (
        <p className="mt-3 text-[11.5px] text-stone-400">
          This purchase was recorded after the fact, so the cost above is what someone remembered
          rather than what was captured at the time.
        </p>
      )}
    </div>
  );
}
