"use client";

import { useState, useTransition } from "react";
import { receiveAction } from "../actions";

interface Line {
  id: number;
  label: string;
  quantity: number;
  receivedQty: number;
}

/**
 * Record a delivery against the order.
 *
 * Quantities are what arrived in THIS delivery, not a running total — partial
 * deliveries are the normal case, and a supplier who sends 60 of 100 should not
 * require the admin to do arithmetic. "Receive all" fills in whatever is still
 * outstanding.
 */
export default function ReceivePanel({ id, lines }: { id: number; lines: Line[] }) {
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const open = lines.filter((l) => l.quantity - l.receivedQty > 0);

  function receiveAll() {
    const next: Record<number, string> = {};
    for (const l of open) next[l.id] = String(l.quantity - l.receivedQty);
    setQuantities(next);
  }

  function submit(formData: FormData) {
    setError(null);
    setNote(null);
    startTransition(async () => {
      const res = await receiveAction(id, formData);
      if (res.error) setError(res.error);
      else {
        setNote(res.success ?? "Received.");
        setQuantities({});
      }
    });
  }

  if (open.length === 0) return null;

  return (
    <form action={submit} className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-[13px] font-semibold text-stone-900">Receive delivery</h2>
          <p className="text-[12px] text-stone-500">
            Enter how many units arrived now. Stock rises immediately and the ledger records why.
          </p>
        </div>
        <button
          type="button"
          onClick={receiveAll}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-[12px] font-medium text-stone-700 hover:border-stone-400"
        >
          Receive all
        </button>
      </div>

      <div className="space-y-2">
        {open.map((l) => {
          const outstanding = l.quantity - l.receivedQty;
          return (
            <div
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-800">{l.label}</p>
                <p className="text-[11.5px] text-stone-400">
                  {outstanding} of {l.quantity} still outstanding
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input type="hidden" name="receiveLineId" value={l.id} />
                <input
                  name="receiveQty"
                  type="number"
                  min="0"
                  max={outstanding}
                  placeholder="0"
                  value={quantities[l.id] ?? ""}
                  onChange={(e) =>
                    setQuantities((prev) => ({ ...prev, [l.id]: e.target.value }))
                  }
                  className="w-24 rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-stone-900"
                />
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-danger-fg">{error}</p>}
      {note && <p className="mt-3 text-sm text-success-fg">{note}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Receiving…" : "Record delivery"}
      </button>
    </form>
  );
}
