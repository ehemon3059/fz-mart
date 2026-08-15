"use client";

import { useState, useTransition } from "react";
import { deleteSupplierAction } from "../purchase-orders/actions";

/**
 * Delete control for a supplier row.
 *
 * A supplier with purchase orders can't be deleted — those orders would lose
 * their attribution — so the button is replaced by an explanation rather than
 * offered and then refused.
 */
export default function SupplierActions({
  id,
  name,
  hasOrders,
}: {
  id: number;
  name: string;
  hasOrders: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (hasOrders) {
    return <span className="text-[11px] text-stone-400">Has orders — deactivate instead</span>;
  }

  function remove() {
    if (!confirm(`Delete supplier “${name}”? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteSupplierAction(id);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="text-[12px] text-stone-400 transition-colors hover:text-danger-fg disabled:opacity-50"
      >
        Delete
      </button>
      {error && <p className="mt-1 text-[11px] text-danger-fg">{error}</p>}
    </div>
  );
}
