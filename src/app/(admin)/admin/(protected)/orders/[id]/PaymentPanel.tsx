"use client";

import { useState, useTransition } from "react";
import type { PaymentMethod, PaymentStatus } from "@prisma/client";
import { formatTaka } from "@/lib/money";
import { markPaymentRefundedAction } from "../actions";

interface PaymentRow {
  id: number;
  provider: string;
  amount: number;
  status: PaymentStatus;
  providerTxnId: string | null;
  createdAt: string; // pre-formatted server-side; Date isn't serializable-stable
}

interface Props {
  orderId: number;
  paymentMethod: PaymentMethod;
  total: number;
  paidAmount: number;
  payments: PaymentRow[];
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  COD: "Cash on Delivery",
  ONLINE: "Paid online (full)",
  PARTIAL: "Partial advance (delivery charge online, rest COD)",
};

const STATUS_BADGE: Record<PaymentStatus, string> = {
  INITIATED: "bg-amber-100 text-amber-700",
  SUCCESS: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  REFUNDED: "bg-gray-200 text-gray-600",
};

export default function PaymentPanel({ orderId, paymentMethod, total, paidAmount, payments }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRefund(paymentId: number) {
    if (!window.confirm("Mark this payment as refunded? Do the actual refund in the provider's panel first — this only records it.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await markPaymentRefundedAction(orderId, paymentId);
      if (result?.error) setError(result.error);
    });
  }

  const codDue = Math.max(0, total - paidAmount);

  return (
    <div className="space-y-3">
      <div className="text-sm space-y-1">
        <p>{METHOD_LABELS[paymentMethod]}</p>
        <div className="flex justify-between">
          <span className="text-gray-500">Paid online</span>
          <span className="font-medium">{formatTaka(paidAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Due on delivery</span>
          <span className="font-medium">{formatTaka(codDue)}</span>
        </div>
      </div>

      {payments.length > 0 && (
        <div className="divide-y border-t">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div>
                <p className="font-medium">
                  {p.provider} — {formatTaka(p.amount)}
                </p>
                <p className="text-xs text-gray-400">
                  {p.providerTxnId ? `Txn ${p.providerTxnId} · ` : ""}
                  {p.createdAt}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status]}`}>
                  {p.status}
                </span>
                {p.status === "SUCCESS" && (
                  <button
                    onClick={() => handleRefund(p.id)}
                    disabled={pending}
                    className="border rounded px-2 py-1 text-xs font-medium hover:border-black disabled:opacity-50"
                  >
                    Mark refunded
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
