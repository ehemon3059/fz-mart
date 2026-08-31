"use client";

import { useState, useTransition } from "react";
import { deletePurchaseOrderAction } from "./actions";

/**
 * Delete control for one purchase-order row.
 *
 * Only a draft or a cancelled order that received NOTHING can go: once units
 * have arrived, the PURCHASE movements that put them on the shelf name this
 * order as their reason, and deleting it would leave the ledger explaining
 * stock with paperwork that no longer exists. The server enforces exactly the
 * same rule — this only decides whether to offer the button, so a row that
 * can't be deleted stays quiet instead of failing after the click.
 */
export default function PurchaseOrderRowActions({
  id,
  poNo,
  canDelete,
}: {
  id: number;
  poNo: string;
  canDelete: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canDelete) return null;

  function remove() {
    if (!confirm(`Delete ${poNo} permanently? This can't be undone.`)) return;
    setError(null);
    startTransition(async () => {
      // stayOnPage keeps the admin on the tab and page they were filtering by;
      // the row vanishes on revalidation rather than bouncing them to "All".
      const res = await deletePurchaseOrderAction(id, { stayOnPage: true });
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label={`Delete ${poNo}`}
        className="text-[12px] text-stone-400 transition-colors hover:text-danger-fg disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <p className="mt-1 text-[11px] text-danger-fg">{error}</p>}
    </div>
  );
}
