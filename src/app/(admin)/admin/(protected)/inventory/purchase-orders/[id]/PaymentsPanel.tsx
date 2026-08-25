"use client";

/**
 * What has been paid to the supplier for this order, and what is still owed.
 *
 * A list of payments rather than a single "amount paid" box, because suppliers
 * here are paid in instalments — an advance to start the order, the balance on
 * delivery — and the useful question ("what do I still owe?") is answered by
 * the history, not by a number someone keeps overwriting.
 */

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { recordPaymentAction, deletePaymentAction } from "../actions";

export interface PaymentRow {
  id: number;
  amount: string;
  paidOn: string;
  method: string | null;
  note: string | null;
  actorName: string;
}

const field =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-accent";
const label = "mb-1 block text-[12px] font-semibold text-stone-600";

export default function PaymentsPanel({
  purchaseOrderId,
  payments,
  total,
  paid,
  due,
  fullyPaid,
  canRecord,
  today,
}: {
  purchaseOrderId: number;
  payments: PaymentRow[];
  total: string;
  paid: string;
  due: string;
  fullyPaid: boolean;
  /** False for a cancelled order — nothing is owed on goods that won't arrive. */
  canRecord: boolean;
  /** "yyyy-mm-dd" from the server, so the default date isn't a hydration risk. */
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await recordPaymentAction(purchaseOrderId, formData);
      if (res?.error) setError(res.error);
      else setOpen(false);
    });
  }

  function remove(id: number) {
    startTransition(async () => {
      const res = await deletePaymentAction(id, purchaseOrderId);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-semibold text-stone-900">Supplier payments</h2>
        {canRecord && !fullyPaid && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-accent underline-offset-2 hover:underline"
          >
            <Icon name="plus" size={13} />
            Record a payment
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200">
        <div className="bg-white px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-stone-500">Order total</p>
          <p className="nums text-[15px] font-bold text-stone-900">{total}</p>
        </div>
        <div className="bg-white px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-stone-500">Paid</p>
          <p className="nums text-[15px] font-bold text-stone-900">{paid}</p>
        </div>
        <div className="bg-white px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-stone-500">Still owed</p>
          <p
            className={[
              "nums text-[15px] font-bold",
              fullyPaid ? "text-success-fg" : "text-warning-fg",
            ].join(" ")}
          >
            {fullyPaid ? "Settled" : due}
          </p>
        </div>
      </div>

      {open && (
        <form action={submit} className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={label}>Amount ৳</label>
              <input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                required
                autoFocus
                className={field}
              />
            </div>
            <div>
              <label className={label}>Paid on</label>
              <input type="date" name="paidOn" defaultValue={today} className={field} />
            </div>
            <div>
              <label className={label}>How</label>
              <input name="method" placeholder="bKash, cash, bank" className={field} />
            </div>
          </div>
          <div className="mt-3">
            <label className={label}>Note</label>
            <input name="note" placeholder="Optional" className={field} />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-accent px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
            >
              {pending ? "Saving…" : "Record payment"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="rounded-lg border border-stone-300 px-3.5 py-2 text-[13px] font-semibold text-stone-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
          {error}
        </p>
      )}

      {payments.length > 0 ? (
        <ul className="mt-4 divide-y divide-stone-100">
          {payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2">
              <span className="text-[13px] text-stone-800">
                <span className="nums font-semibold">{p.amount}</span>
                <span className="ml-2 text-[12px] text-stone-500">{p.paidOn}</span>
                {p.method && <span className="ml-2 text-[12px] text-stone-500">· {p.method}</span>}
                {p.note && <span className="ml-2 text-[12px] text-stone-400">{p.note}</span>}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-[11.5px] text-stone-400">by {p.actorName}</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(p.id)}
                  title="Remove this payment record"
                  className="text-[12px] text-stone-400 transition hover:text-danger-fg disabled:opacity-40"
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[12.5px] text-stone-500">
          {canRecord
            ? "Nothing recorded yet."
            : "This order was cancelled — nothing is owed on it."}
        </p>
      )}

      <p className="mt-3 border-t border-stone-100 pt-2.5 text-[11.5px] text-stone-400">
        Kept separate from the profit report on purpose: goods count as a cost when they are sold,
        not when the supplier is paid.
      </p>
    </div>
  );
}
