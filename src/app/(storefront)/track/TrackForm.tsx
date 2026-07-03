"use client";

import { useState, useTransition } from "react";
import { formatTaka } from "@/lib/money";
import {
  ORDER_STATUS_LABELS,
  ORDER_FLOW,
  ORDER_STATUS_BADGE,
} from "@/config/order-status";
import { lookupOrder, type TrackResult } from "./actions";
import type { OrderStatus } from "@prisma/client";

const STEP_HINTS: Record<string, string> = {
  PENDING: "We've received your order and will confirm it shortly.",
  CONFIRMED: "Your order is confirmed and being prepared.",
  SHIPPED: "Your order is on the way to your address.",
  DELIVERED: "Your order has been delivered. Enjoy!",
};

function fmtDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Vertical timeline for the happy-path flow (Pending → Delivered). */
function Timeline({ status }: { status: OrderStatus }) {
  const currentIdx = ORDER_FLOW.indexOf(status);
  return (
    <ol className="relative space-y-0">
      {ORDER_FLOW.map((step, i) => {
        const done = currentIdx >= i;
        const isCurrent = currentIdx === i;
        const isLast = i === ORDER_FLOW.length - 1;
        return (
          <li key={step} className="flex gap-4">
            {/* node + connector */}
            <div className="flex flex-col items-center">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition ${
                  done ? "bg-[var(--brand)] text-white" : "bg-stone-100 text-stone-400"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              {!isLast && (
                <span
                  className={`my-1 w-0.5 flex-1 ${currentIdx > i ? "bg-[var(--brand)]" : "bg-stone-200"}`}
                  style={{ minHeight: 28 }}
                />
              )}
            </div>
            {/* label */}
            <div className={isLast ? "" : "pb-5"}>
              <p
                className={`text-[14.5px] font-semibold ${
                  done ? "text-stone-900" : "text-stone-400"
                }`}
              >
                {ORDER_STATUS_LABELS[step]}
                {isCurrent && (
                  <span className="ml-2 rounded-full bg-[var(--brand-tint)] px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-dark)]">
                    Current
                  </span>
                )}
              </p>
              {done && <p className="mt-0.5 text-[13px] text-stone-500">{STEP_HINTS[step]}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function TrackForm({ initialOrderNo }: { initialOrderNo?: string }) {
  const [result, setResult] = useState<TrackResult | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await lookupOrder(formData);
      setResult(res);
    });
  }

  const order = result?.order;
  const isTerminal = order && (order.status === "CANCELLED" || order.status === "RETURNED");

  return (
    <div className="space-y-8">
      {/* Lookup form */}
      <form
        action={handleSubmit}
        className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">
              Order number
            </label>
            <input
              name="orderNo"
              required
              defaultValue={initialOrderNo}
              placeholder="e.g. FZ482913"
              className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[14.5px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-tint)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">
              Phone number
            </label>
            <input
              name="phone"
              required
              inputMode="numeric"
              placeholder="Used at checkout"
              className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[14.5px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-tint)]"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="mt-5 w-full rounded-xl bg-[var(--brand)] py-3 text-[14.5px] font-semibold text-white shadow-sm transition hover:bg-[var(--brand-dark)] disabled:opacity-60 sm:w-auto sm:px-8"
        >
          {pending ? "Searching…" : "Track Order"}
        </button>
      </form>

      {/* Error */}
      {result?.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-600">
          {result.error}
        </p>
      )}

      {/* Result */}
      {order && (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          {/* header strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 bg-stone-50/60 px-6 py-4">
            <div>
              <p className="text-[12.5px] text-stone-400">Order number</p>
              <p className="font-mono text-[16px] font-bold text-stone-900">{order.orderNo}</p>
            </div>
            <div className="text-right">
              <p className="text-[12.5px] text-stone-400">Placed on</p>
              <p className="text-[14px] font-semibold text-stone-700">{fmtDate(order.createdAt)}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[12.5px] font-bold ${ORDER_STATUS_BADGE[order.status]}`}
            >
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>

          <div className="space-y-7 px-6 py-6">
            {/* progress */}
            <div>
              <h2 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-stone-400">
                Progress
              </h2>
              {isTerminal ? (
                <div
                  className={`rounded-xl border px-4 py-4 ${
                    order.status === "CANCELLED"
                      ? "border-stone-200 bg-stone-50 text-stone-600"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  <p className="text-[14.5px] font-semibold">
                    This order was {ORDER_STATUS_LABELS[order.status].toLowerCase()}.
                  </p>
                  <p className="mt-0.5 text-[13px] opacity-80">
                    If you have questions, please contact our support team.
                  </p>
                </div>
              ) : (
                <Timeline status={order.status} />
              )}
            </div>

            {/* items */}
            <div>
              <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-stone-400">
                Items
              </h2>
              <div className="divide-y divide-stone-100 rounded-xl border border-stone-100">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-[14px] text-stone-700">
                      {item.productName}
                      <span className="ml-1.5 text-stone-400">× {item.quantity}</span>
                    </span>
                    <span className="text-[14px] font-semibold text-stone-900">
                      {formatTaka(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* totals */}
            <div className="space-y-2 border-t border-stone-100 pt-4 text-[14px]">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal</span>
                <span>{formatTaka(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Delivery{order.shippingZone ? ` · ${order.shippingZone.name}` : ""}</span>
                <span>{formatTaka(order.deliveryCharge)}</span>
              </div>
              <div className="flex justify-between border-t border-stone-100 pt-2 text-[16px] font-bold text-stone-900">
                <span>Total</span>
                <span>{formatTaka(order.total)}</span>
              </div>
            </div>

            {/* delivery to */}
            <div className="rounded-xl bg-stone-50 px-4 py-3 text-[13.5px]">
              <p className="font-semibold text-stone-700">Delivering to</p>
              <p className="mt-0.5 text-stone-500">
                {order.customerName} · {order.customerPhone}
              </p>
              <p className="text-stone-500">{order.address}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
