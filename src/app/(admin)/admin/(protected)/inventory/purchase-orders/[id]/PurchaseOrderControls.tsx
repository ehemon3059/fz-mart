"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { PurchaseOrderStatus } from "@prisma/client";
import {
  markOrderedAction,
  cancelPurchaseOrderAction,
  deletePurchaseOrderAction,
} from "../actions";

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

  function remove() {
    // Deleting is the only irreversible control here, so it names the order and
    // says what survives: nothing, because only an order that received nothing
    // can be deleted at all.
    if (!confirm(`Delete ${poNo} permanently? This can't be undone.`)) return;
    run(() => deletePurchaseOrderAction(id));
  }

  function cancel() {
    const warning = hasReceipts
      ? `Cancel ${poNo}? Units already received stay on the shelf — only the outstanding ones are dropped.`
      : `Cancel ${poNo}?`;
    if (!confirm(warning)) return;
    run(() => cancelPurchaseOrderAction(id));
  }

  // A cancelled order that never received anything is a mistake worth clearing
  // away; a received one is the ledger's explanation for stock on a shelf and
  // must stay. RECEIVED is therefore terminal with nothing left to offer.
  const canDelete = !hasReceipts && (status === "DRAFT" || status === "CANCELLED");
  const nothingToShow = status === "RECEIVED" || (status === "CANCELLED" && !canDelete);
  if (nothingToShow && !note && !error) return null;

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
          <Link
            href={`/admin/inventory/purchase-orders/${id}/edit`}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-stone-400"
          >
            Edit
          </Link>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-stone-500 transition hover:text-danger-fg disabled:opacity-50"
          >
            Delete
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
