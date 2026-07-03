import type { OrderStatus } from "@prisma/client";

// Single source of truth for the order lifecycle. The admin status dropdown
// and the public tracking page both read from here, so the flow can never
// drift between them.

/** The forward-moving "happy path", in display order. */
export const ORDER_FLOW: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
];

/** Terminal exits that can happen from most non-delivered states. */
export const ORDER_TERMINAL: OrderStatus[] = ["CANCELLED", "RETURNED"];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting Payment",
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};

/** Tailwind classes for the status pill, shared by the list and detail views. */
export const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-orange-100 text-orange-700",
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-200 text-gray-600",
  RETURNED: "bg-red-100 text-red-700",
};

/**
 * Allowed next statuses from a given status. Used to validate admin
 * transitions so the state machine can't be jumped arbitrarily.
 */
export function nextStatuses(current: OrderStatus): OrderStatus[] {
  // PENDING_PAYMENT is system-managed: the payment webhook promotes it to
  // PENDING (via markOrderPaid, outside this state machine) and the expiry
  // job cancels it. The only manual admin move is an early cancel.
  if (current === "PENDING_PAYMENT") return ["CANCELLED"];
  const idx = ORDER_FLOW.indexOf(current);
  if (idx === -1) return []; // already terminal
  const forward = ORDER_FLOW[idx + 1] ? [ORDER_FLOW[idx + 1]] : [];
  // Cancel/return allowed until the order is delivered.
  const exits = current === "DELIVERED" ? ["RETURNED" as OrderStatus] : ORDER_TERMINAL;
  return [...forward, ...exits];
}
