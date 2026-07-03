"use client";

import { useState, useTransition } from "react";
import type { OrderStatus } from "@prisma/client";
import { saveOrderFinancials } from "../actions";

interface Props {
  orderId: number;
  status: OrderStatus;
  /** All values in paisa, straight from the order row. */
  shippingCost: number;
  returnShippingCost: number;
  paymentGatewayFee: number;
  returnRestockable: boolean;
}

const toTaka = (paisa: number) => (paisa ? String(paisa / 100) : "");

export default function OrderFinancials({
  orderId,
  status,
  shippingCost,
  returnShippingCost,
  paymentGatewayFee,
  returnRestockable,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const isReturned = status === "RETURNED";

  function handleSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveOrderFinancials(orderId, formData);
      if (result?.error) setError(result.error);
      else setSaved(true);
    });
  }

  const fieldCls =
    "w-full bg-transparent px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400";
  const shellCls =
    "flex items-center overflow-hidden rounded border border-gray-200 focus-within:border-black";

  return (
    <form action={handleSubmit} className="space-y-4">
      <p className="text-xs text-gray-500">
        The shop&apos;s own costs for this order. These feed the monthly P&amp;L —
        the customer never sees them.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Outbound shipping cost</label>
          <div className={shellCls}>
            <span className="border-r border-gray-200 bg-gray-50 px-2.5 py-2 text-sm text-gray-500">৳</span>
            <input
              name="shippingCost"
              type="number"
              min="0"
              step="0.01"
              defaultValue={toTaka(shippingCost)}
              placeholder="0"
              className={fieldCls}
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">Courier fee you pay to deliver.</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">COD / gateway fee</label>
          <div className={shellCls}>
            <span className="border-r border-gray-200 bg-gray-50 px-2.5 py-2 text-sm text-gray-500">৳</span>
            <input
              name="paymentGatewayFee"
              type="number"
              min="0"
              step="0.01"
              defaultValue={toTaka(paymentGatewayFee)}
              placeholder="0"
              className={fieldCls}
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">Cash-handling / wallet processing cut.</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Return shipping cost</label>
          <div className={shellCls}>
            <span className="border-r border-gray-200 bg-gray-50 px-2.5 py-2 text-sm text-gray-500">৳</span>
            <input
              name="returnShippingCost"
              type="number"
              min="0"
              step="0.01"
              defaultValue={toTaka(returnShippingCost)}
              placeholder="0"
              className={fieldCls}
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">Fee lost if the parcel comes back.</p>
        </div>

        <div className="flex items-start">
          <label className="mt-6 flex cursor-pointer items-center gap-2.5 text-sm font-medium text-gray-700">
            <input
              name="returnRestockable"
              type="checkbox"
              defaultChecked={returnRestockable}
              className="h-4 w-4 rounded border-gray-300"
            />
            Returned goods are resellable
          </label>
        </div>
      </div>

      {isReturned && (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This order is <b>returned</b>. If the goods are damaged, untick
          &ldquo;resellable&rdquo; — their sourcing cost is then booked as an
          Inventory Loss in the P&amp;L instead of returning to stock.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !error && <p className="text-sm text-green-600">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save costs"}
      </button>
    </form>
  );
}
