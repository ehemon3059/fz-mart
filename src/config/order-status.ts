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

/**
 * Statuses in which an order holds an OPEN RESERVATION: units are promised to
 * it and sitting on the shelf, neither shipped out nor freed.
 *
 * SHIPPED and DELIVERED are absent on purpose — shipping consumes the
 * reservation (see fulfilsReservation below), after which the units are gone
 * from stock entirely and there is no reservation left to release.
 */
export const RESERVATION_OPEN: OrderStatus[] = ["PENDING_PAYMENT", "PENDING", "CONFIRMED"];

/**
 * Whether moving `from` → `to` SHIPS the goods, converting the reservation into
 * an actual stock decrease. This is the moment a sale becomes real on the shelf.
 */
export function fulfilsReservation(from: OrderStatus, to: OrderStatus): boolean {
  return RESERVATION_OPEN.includes(from) && to === "SHIPPED";
}

/**
 * Whether moving `from` → `to` frees an OPEN reservation without shipping it —
 * the order died before the parcel left. The units were never taken off the
 * shelf, so nothing is "returned"; they simply become available again and no
 * ledger movement is written.
 */
export function releasesReservation(from: OrderStatus, to: OrderStatus): boolean {
  return RESERVATION_OPEN.includes(from) && to === "CANCELLED";
}

/**
 * Whether moving `from` → `to` brings ALREADY-SHIPPED goods back onto the shelf.
 *
 * Only reachable from a state whose reservation was already consumed, so this
 * is a genuine stock increase and does get a ledger movement.
 *
 *   RETURNED   — the parcel came back; credited only if the goods are resellable.
 *                A damaged return is a write-off (recorded as RETURN + DAMAGE),
 *                handled by the caller, not counted here.
 *   CANCELLED  — a courier can cancel an already-shipped parcel; the goods come
 *                back the same way.
 *
 * The caller still owns idempotency (Order.restockedAt); this answers only
 * "should it?", never "has it already?".
 */
export function returnsFulfilledStock(
  from: OrderStatus,
  to: OrderStatus,
  returnRestockable: boolean,
): boolean {
  if (from !== "SHIPPED" && from !== "DELIVERED") return false;
  if (to === "CANCELLED") return true;
  if (to === "RETURNED") return returnRestockable;
  return false;
}
