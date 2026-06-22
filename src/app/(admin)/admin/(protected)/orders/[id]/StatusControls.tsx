"use client";

import { useState, useTransition } from "react";
import type { OrderStatus } from "@prisma/client";
import { ORDER_STATUS_LABELS } from "@/config/order-status";
import { advanceOrderStatus } from "../actions";

export default function StatusControls({
  orderId,
  options,
}: {
  orderId: number;
  options: OrderStatus[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (options.length === 0) {
    return <p className="text-sm text-gray-400">This order has no further transitions.</p>;
  }

  function handleClick(status: OrderStatus) {
    setError(null);
    startTransition(async () => {
      const result = await advanceOrderStatus(orderId, status);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {options.map((status) => (
          <button
            key={status}
            onClick={() => handleClick(status)}
            disabled={pending}
            className="border rounded px-3 py-1.5 text-sm font-medium hover:border-black disabled:opacity-50"
          >
            Mark as {ORDER_STATUS_LABELS[status]}
          </button>
        ))}
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
