"use client";

import { useState, useTransition } from "react";
import { formatTaka } from "@/lib/money";
import { ORDER_STATUS_LABELS, ORDER_FLOW } from "@/config/order-status";
import { lookupOrder, type TrackResult } from "./actions";

export default function TrackForm({ initialOrderNo }: { initialOrderNo?: string }) {
  const [result, setResult] = useState<TrackResult | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await lookupOrder(formData);
      setResult(res);
    });
  }

  return (
    <div className="space-y-6">
      <form action={handleSubmit} className="flex flex-col gap-3 max-w-sm">
        <input
          name="orderNo"
          required
          defaultValue={initialOrderNo}
          placeholder="Order number (e.g. FZ482913)"
          className="border rounded px-3 py-2"
        />
        <input
          name="phone"
          required
          inputMode="numeric"
          placeholder="Phone number used at checkout"
          className="border rounded px-3 py-2"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-black text-white rounded py-2 font-medium disabled:opacity-50"
        >
          {pending ? "Searching..." : "Track Order"}
        </button>
      </form>

      {result?.error && (
        <p className="text-red-600 text-sm font-medium">{result.error}</p>
      )}

      {result?.order && (
        <div className="border rounded-lg bg-white p-6 space-y-4 max-w-md">
          <div className="flex justify-between">
            <span className="text-gray-500 text-sm">Order No.</span>
            <span className="font-mono font-bold">{result.order.orderNo}</span>
          </div>

          <ol className="flex flex-wrap gap-2 text-xs">
            {ORDER_FLOW.map((status) => {
              const reached =
                ORDER_FLOW.indexOf(result.order!.status) >= ORDER_FLOW.indexOf(status);
              return (
                <li
                  key={status}
                  className={`px-2 py-1 rounded ${
                    reached ? "bg-black text-white" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {ORDER_STATUS_LABELS[status]}
                </li>
              );
            })}
          </ol>

          {(result.order.status === "CANCELLED" || result.order.status === "RETURNED") && (
            <p className="text-sm font-medium text-red-600">
              {ORDER_STATUS_LABELS[result.order.status]}
            </p>
          )}

          <div className="divide-y border-t">
            {result.order.items.map((item) => (
              <div key={item.id} className="flex justify-between py-2 text-sm">
                <span>
                  {item.productName} × {item.quantity}
                </span>
                <span>{formatTaka(item.unitPrice * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between font-bold border-t pt-3">
            <span>Total</span>
            <span>{formatTaka(result.order.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
