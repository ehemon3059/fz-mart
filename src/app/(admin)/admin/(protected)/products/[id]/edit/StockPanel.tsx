"use client";

import { useState, useTransition } from "react";
import { adjustStockAction } from "../../inventory-actions";

interface HistoryRow {
  id: number;
  delta: number;
  newStock: number;
  reason: string;
  adminName: string;
  createdAt: string;
}

// Manual stock corrections + audit history for a product. Product-level stock
// only (variant corrections can be added later); every change is logged.
export default function StockPanel({
  productId,
  currentStock,
  history,
}: {
  productId: number;
  currentStock: number;
  history: HistoryRow[];
}) {
  const [stock, setStock] = useState(currentStock);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await adjustStockAction(productId, formData);
      if (res.error) setError(res.error);
      else if (res.newStock != null) setStock(res.newStock);
    });
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Inventory corrections</h2>
        <span className="text-sm text-stone-500">
          On hand: <span className="font-semibold text-stone-800">{stock}</span>
        </span>
      </div>
      <p className="mt-1 text-[13px] text-stone-400">
        For manual corrections only (received shipment, damage, stock-take). Every change is logged.
      </p>

      <form action={submit} className="mt-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-stone-600">Direction</label>
          <select name="direction" className="rounded-lg border border-stone-300 px-2 py-2 text-sm">
            <option value="add">Add (+)</option>
            <option value="remove">Remove (−)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-stone-600">Quantity</label>
          <input name="amount" type="number" min="1" required className="w-24 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="mb-1 block text-[12px] font-semibold text-stone-600">Reason</label>
          <input name="reason" required placeholder="e.g. New shipment received" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" disabled={pending} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          Apply
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {history.length > 0 && (
        <div className="mt-5">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-stone-500">History</h3>
          <div className="mt-2 divide-y divide-stone-100 text-sm">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between py-2">
                <div>
                  <span className={h.delta >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-red-600"}>
                    {h.delta >= 0 ? `+${h.delta}` : h.delta}
                  </span>{" "}
                  <span className="text-stone-500">→ {h.newStock}</span>
                  <span className="text-stone-400"> · {h.reason}</span>
                </div>
                <div className="text-[12px] text-stone-400">
                  {h.adminName} · {h.createdAt}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
