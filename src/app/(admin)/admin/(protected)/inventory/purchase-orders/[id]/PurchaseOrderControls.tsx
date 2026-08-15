"use client";

import { useState, useTransition } from "react";
import type { PurchaseOrderStatus } from "@prisma/client";
import { markOrderedAction, cancelPurchaseOrderAction } from "../actions";

/**
 * Lifecycle buttons for one purchase order. Which actions exist depends on the
 * status, so an order can't be placed twice or cancelled after it has closed.
 */
export default function PurchaseOrderControls({
  id,
  status,
  poNo,
  hasReceipts,
}: {
  id: number;
  status: PurchaseOrderStatus;
  poNo: string;
  hasReceipts: boolean;
}) {
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ error?: string; success?: string }>) {
    setError(null);
    setNote(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else if (res.success) setNote(res.success);
    });
  }

  function cancel() {
    const warning = hasReceipts
      ? `Cancel ${poNo}? Units already received stay on the shelf — only the outstanding ones are dropped.`
      : `Cancel ${poNo}?`;
    if (!confirm(warning)) return;
    run(() => cancelPurchaseOrderAction(id));
  }

  const terminal = status === "RECEIVED" || status === "CANCELLED";
  if (terminal && !note && !error) return null;

  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        {status === "DRAFT" && (
          <button
            type="button"
            onClick={() => run(() => markOrderedAction(id))}
            disabled={pending}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Place order
          </button>
        )}
        {(status === "DRAFT" || status === "ORDERED") && (
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 disabled:opacity-50"
          >
            Cancel order
          </button>
        )}
        {status === "DRAFT" && (
          <span className="text-[12px] text-stone-400">
            Placing it starts counting these units as incoming.
          </span>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-danger-fg">{error}</p>}
      {note && <p className="mt-2 text-sm text-success-fg">{note}</p>}
    </div>
  );
}
