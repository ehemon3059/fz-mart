"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { deleteSupplierAction } from "../purchase-orders/actions";

/**
 * Delete control for a supplier row.
 *
 * The button is ALWAYS rendered, even for a supplier that can't be deleted.
 * Hiding it was the old behaviour and it read as a bug: three suppliers simply
 * had no control where every other row had one, with nothing on screen to say
 * why. A disabled button carrying the reason answers the question the missing
 * one raised.
 *
 * `ledgerLocked` mirrors the server's rule exactly (see deleteSupplier) — only
 * a supplier whose goods actually arrived through the stock ledger is locked.
 * Drafts, cancelled orders and backfills are paperwork this deletion takes with
 * it, which is why the dialog says so before it happens.
 */
export default function SupplierActions({
  id,
  name,
  orderCount,
  ledgerLocked,
}: {
  id: number;
  name: string;
  orderCount: number;
  ledgerLocked: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (ledgerLocked) {
    return (
      <div className="text-right">
        <button
          type="button"
          disabled
          title={
            `${name} has received stock. The inventory ledger names its purchase orders as ` +
            `the reason those goods are on the shelf, so it can't be deleted — open it and ` +
            `set it to Inactive instead.`
          }
          className="cursor-not-allowed text-[12px] text-stone-300"
        >
          Delete
        </button>
        <div className="text-[11px] text-stone-400">Received stock</div>
      </div>
    );
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const res = await deleteSupplierAction(id);
      // Closed either way: the failure message renders in the row, and leaving
      // the modal up would hide it behind the overlay.
      setConfirming(false);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending}
        aria-label={`Delete ${name}`}
        className="text-[12px] text-stone-400 transition-colors hover:text-danger-fg disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <p className="mt-1 text-[11px] text-danger-fg">{error}</p>}

      <ConfirmDialog
        open={confirming}
        title={`Delete ${name}?`}
        message={
          orderCount > 0
            ? `Its ${orderCount} purchase order${orderCount === 1 ? "" : "s"} will be deleted too, ` +
              `along with any payments recorded against them. None of them moved stock, so nothing ` +
              `on your shelves changes. This can't be undone.`
            : "This can't be undone."
        }
        confirmLabel="Delete supplier"
        loading={pending}
        onConfirm={remove}
        onCancel={() => {
          if (pending) return;
          setConfirming(false);
          setError(null);
        }}
      />
    </div>
  );
}
