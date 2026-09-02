"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { deleteOrdersAction } from "./actions";

/**
 * Per-row Delete on the orders table. Calls the same action as the bulk bar
 * with a batch of one, so the guard, the audit entry and the protections that
 * refuse a paid or shipped order are identical whichever way an order goes.
 */
export default function DeleteOrderButton({
  id,
  orderNo,
}: {
  id: number;
  orderNo: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteOrdersAction([id]);
      // Closed either way — the refusal reason renders in the row, and the
      // overlay would hide it.
      setConfirming(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      const refused = result.blocked?.[0];
      if (refused) {
        setError(`Not deleted — ${refused.reason}.`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending}
        aria-label={`Delete order ${orderNo}`}
        className="text-red-600 hover:underline disabled:opacity-40"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}

      <ConfirmDialog
        open={confirming}
        title={`Delete order ${orderNo}?`}
        message={
          "Its items, notes and status history go with it, and any stock it is still " +
          "holding goes back on the shelf. This cannot be undone."
        }
        confirmLabel="Delete order"
        loading={pending}
        onConfirm={remove}
        onCancel={() => {
          if (pending) return;
          setConfirming(false);
          setError(null);
        }}
      />
    </>
  );
}
