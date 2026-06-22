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
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};

/**
 * Allowed next statuses from a given status. Used to validate admin
 * transitions so the state machine can't be jumped arbitrarily.
 */
export function nextStatuses(current: OrderStatus): OrderStatus[] {
  const idx = ORDER_FLOW.indexOf(current);
  if (idx === -1) return []; // already terminal
  const forward = ORDER_FLOW[idx + 1] ? [ORDER_FLOW[idx + 1]] : [];
  // Cancel/return allowed until the order is delivered.
  const exits = current === "DELIVERED" ? ["RETURNED" as OrderStatus] : ORDER_TERMINAL;
  return [...forward, ...exits];
}
