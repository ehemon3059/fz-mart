import Link from "next/link";
import { formatTaka } from "@/lib/money";
import type { FinishingSource } from "@/server/purchasing";

/**
 * The purchase order an admin arrived from, carried to the top of the form.
 *
 * Finishing a product means choosing a price, and the only number that decides
 * whether a price is any good is what the units cost to get here. That number
 * lived on the purchase order the admin just left, so it comes with them —
 * otherwise pricing is done from memory, one browser tab away from the figure
 * it depends on.
 *
 * Read-only, and deliberately so: everything here is the OUTPUT of purchasing.
 * Editing a freight charge from a product form would rewrite the landed cost of
 * every other product on the same shipment, so the only affordance is a link
 * back to the order itself.
 */
export default function FinishingFromPo({ source }: { source: FinishingSource }) {
  const outstanding = source.orderedQty - source.receivedQty;

  return (
    <div className="mx-5 rounded-xl border border-accent/30 bg-accent-soft/40 p-5 lg:mx-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-semibold text-stone-900">
          Finishing what you bought on {source.poNo}
        </h2>
        <Link
          href={`/admin/inventory/purchase-orders/${source.poId}`}
          className="text-[12.5px] font-semibold text-stone-500 underline-offset-2 hover:text-accent hover:underline"
        >
          Back to the order →
        </Link>
      </div>
      <p className="mt-1 text-[13px] text-stone-600">
        {source.receivedQty} of {source.orderedQty} unit
        {source.orderedQty === 1 ? "" : "s"} received from{" "}
        <span className="font-semibold text-stone-800">{source.supplierName}</span>
        {outstanding > 0 && ` — ${outstanding} still to come`}. Each option below shows what its
        own units landed at; price against that.
      </p>

      {/* The purchase itself, line by line — the same rows as the order, so the
          two screens can be read against each other without translating. The
          landed column is the one that matters here: it is what each unit cost
          once freight is counted, and so the floor any price has to clear. */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full min-w-[480px] border-collapse text-left">
          <thead>
            <tr className="border-b border-stone-100">
              <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                Option
              </th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                Qty
              </th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                Price / unit
              </th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                Total
              </th>
              <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                Landed / unit
              </th>
            </tr>
          </thead>
          <tbody>
            {source.lines.map((l, i) => (
              <tr key={`${l.label}-${i}`} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-2.5">
                  <div className="text-[13px] font-medium text-stone-800">{l.label}</div>
                  {l.receivedQty > 0 && (
                    <div className="text-[11.5px] text-emerald-700">
                      {l.receivedQty} received
                      {l.receivedQty < l.quantity && ` of ${l.quantity}`}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right text-[13px] tabular-nums text-stone-700">
                  {l.quantity}
                </td>
                <td className="px-3 py-2.5 text-right text-[13px] tabular-nums text-stone-700">
                  {formatTaka(l.unitCost)}
                </td>
                <td className="px-3 py-2.5 text-right text-[13px] tabular-nums text-stone-700">
                  {formatTaka(l.lineTotal)}
                </td>
                <td
                  title="Supplier price plus this option's share of the shipment costs"
                  className="px-4 py-2.5 text-right text-[13px] font-semibold tabular-nums text-stone-900"
                >
                  {formatTaka(l.landed)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-stone-200 bg-stone-50/70">
              <td className="px-4 py-2.5 text-[12.5px] font-semibold text-stone-700">
                Total goods cost
              </td>
              <td className="px-3 py-2.5 text-right text-[13px] font-semibold tabular-nums text-stone-700">
                {source.orderedQty}
              </td>
              <td />
              <td className="px-3 py-2.5 text-right text-[13px] font-bold tabular-nums text-stone-900">
                {formatTaka(source.goodsCost)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-stone-200 bg-white px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Cost of these units
          </div>
          <div className="mt-0.5 text-[17px] font-bold tabular-nums text-stone-900">
            {formatTaka(source.landedTotal)}
          </div>
          <div className="text-[11.5px] text-stone-400">
            goods plus {source.sharedShipment ? "their share of the" : "the"} extras
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Extra costs
          </div>
          <div className="mt-0.5 text-[17px] font-bold tabular-nums text-stone-900">
            {formatTaka(source.extrasTotal)}
          </div>
          {source.extras.length > 0 ? (
            <ul className="mt-1.5 space-y-0.5 border-t border-stone-100 pt-1.5">
              {source.extras.map((e) => (
                <li
                  key={e.label}
                  className="flex justify-between gap-3 text-[11.5px] text-stone-500"
                >
                  <span>{e.label}</span>
                  <span className="tabular-nums">{formatTaka(e.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-[11.5px] text-stone-400">none on this order</div>
          )}
        </div>
      </div>

      <p className="mt-3 border-t border-accent/20 pt-2.5 text-[12.5px] text-stone-600">
        {source.sharedShipment
          ? // The extras belong to the whole shipment. Adding all of them to one
            // product's goods cost would overstate what that product cost, so
            // only its apportioned share is counted above.
            "This order carried other products too, so the extras above are the whole shipment's — each option is charged only its share, by value."
          : "The extras are spread across every option by value, so a dearer option carries more of the freight than a cheap one."}
      </p>
    </div>
  );
}
