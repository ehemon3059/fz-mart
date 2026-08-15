import type { Prisma } from "@prisma/client";
import { recordMovement } from "./ledger";

// Reservation lifecycle (Phase D).
//
// Before this, checkout took units straight off the shelf, so "97 in stock"
// silently included units promised to orders that might never happen. Now:
//
//   ON HAND   (stock)     — physically in the warehouse
//   RESERVED  (reserved)  — promised to orders that haven't shipped or died
//   AVAILABLE (derived)   — stock − reserved, what the storefront may sell
//
// The lifecycle has exactly three exits, and an order takes exactly one:
//
//   reserve()  checkout      reserved +N            (stock unchanged)
//   fulfil()   order ships   reserved −N, stock −N  (units leave for good)
//   release()  order dies    reserved −N            (units free again)
//
// Idempotency is carried on the Order row: fulfilledAt and restockedAt are
// claimed with conditional updates, so a retried job or a re-entered transition
// can never double-apply. An order can be fulfilled or released, never both.
//
// The ledger only records fulfil() as a SALE, because that is the moment stock
// actually changes. A reservation moves no units, so recording one would make
// the ledger disagree with the shelf.

type TxClient = Prisma.TransactionClient;

export class ReservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReservationError";
  }
}

/**
 * What a shopper may actually buy: on hand minus what is promised to other
 * unshipped orders.
 *
 * THE definition of availability — every storefront surface (product page, cart
 * validation, back-in-stock checks) must go through this rather than reading
 * `stock` directly, or it will offer units that are already spoken for.
 *
 * Floored at zero so an over-reserved row (which shouldn't happen, but would be
 * a counter bug rather than a shopper's problem) reads as sold out instead of
 * negative.
 */
export function availableOf(row: { stock: number; reserved: number }): number {
  return Math.max(0, row.stock - row.reserved);
}

/**
 * Reserve units for one cart line, atomically.
 *
 * The conditional update is the anti-oversell guard, and it is written against
 * AVAILABILITY rather than raw stock: `stock >= reserved + quantity`. Two
 * shoppers racing for the last unit both pass the earlier read, but only one
 * satisfies this predicate at write time. Raw SQL because Prisma cannot express
 * a WHERE that compares two columns.
 *
 * Returns false when there is not enough available — the caller turns that into
 * the "just sold out" message.
 */
export async function reserveUnits(
  tx: TxClient,
  params: { productId: number; variantId?: number | null; quantity: number },
): Promise<boolean> {
  const { productId, variantId, quantity } = params;
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new ReservationError("Reservation quantity must be a positive whole number.");
  }

  const affected =
    variantId != null
      ? await tx.$executeRaw`
          UPDATE ProductVariant
          SET reserved = reserved + ${quantity}
          WHERE id = ${variantId} AND stock - reserved >= ${quantity}
        `
      : await tx.$executeRaw`
          UPDATE Product
          SET reserved = reserved + ${quantity}
          WHERE id = ${productId} AND stock - reserved >= ${quantity}
        `;

  return affected === 1;
}

/**
 * Consume an order's reservation because the parcel shipped: the units leave
 * both `reserved` and `stock`. This is the moment a SALE hits the ledger.
 *
 * Idempotent via Order.fulfilledAt. Returns false if already fulfilled.
 */
export async function fulfilOrder(
  tx: TxClient,
  orderId: number,
  actorName: string,
): Promise<boolean> {
  const claimed = await tx.order.updateMany({
    where: { id: orderId, fulfilledAt: null, restockedAt: null },
    data: { fulfilledAt: new Date() },
  });
  if (claimed.count === 0) return false;

  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const item of items) {
    if (item.productId == null) continue; // product deleted; nothing to move

    // Drop the reservation first. Doing it in the same statement as the stock
    // decrement is not possible through recordMovement (which owns the stock
    // write), so the reservation is released here and the stock decrement is
    // recorded below — both inside this transaction, so no reader sees a state
    // where the units are neither reserved nor deducted.
    await releaseReservationRow(tx, item.productId, item.variantId, item.quantity);

    await recordMovement(tx, {
      productId: item.productId,
      variantId: item.variantId,
      type: "SALE",
      delta: -item.quantity,
      unitCost: item.purchaseCost,
      orderId,
      actorName,
    });
  }
  return true;
}

/**
 * Drop an order's reservation without shipping it — the order was cancelled, so
 * the units were never really sold and simply become available again.
 *
 * No ledger row: nothing left the shelf, so nothing moved. The order's death is
 * already recorded in OrderStatusLog.
 *
 * Idempotent via Order.restockedAt, the same marker the pre-Phase-D restock
 * paths used. Returns false if the reservation was already settled.
 */
export async function releaseOrder(tx: TxClient, orderId: number): Promise<boolean> {
  const claimed = await tx.order.updateMany({
    where: { id: orderId, restockedAt: null, fulfilledAt: null },
    data: { restockedAt: new Date() },
  });
  if (claimed.count === 0) return false;

  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const item of items) {
    if (item.productId == null) continue;
    await releaseReservationRow(tx, item.productId, item.variantId, item.quantity);
  }
  return true;
}

/**
 * Lower `reserved` on one stock row, floored at zero.
 *
 * The GREATEST(...) floor is deliberate belt-and-braces: reserved should never
 * go negative because every release is paired with a reservation, but a floor
 * means that if it ever did (a bad backfill, a manual DB edit) the counter
 * self-heals toward zero instead of poisoning availability for every future
 * shopper.
 */
async function releaseReservationRow(
  tx: TxClient,
  productId: number,
  variantId: number | null,
  quantity: number,
): Promise<void> {
  if (variantId != null) {
    await tx.$executeRaw`
      UPDATE ProductVariant
      SET reserved = GREATEST(reserved - ${quantity}, 0)
      WHERE id = ${variantId}
    `;
  } else {
    await tx.$executeRaw`
      UPDATE Product
      SET reserved = GREATEST(reserved - ${quantity}, 0)
      WHERE id = ${productId}
    `;
  }
}

/**
 * Return units to the shelf that had ALREADY been fulfilled — a delivered order
 * coming back resellable. This is a real stock increase, so it is a ledger
 * movement, unlike releasing an open reservation.
 *
 * Guarded on fulfilledAt: only a shipped order's units can come back, and
 * restockedAt then marks them as returned so it cannot happen twice.
 */
export async function returnFulfilledOrder(
  tx: TxClient,
  orderId: number,
  actorName: string,
): Promise<boolean> {
  const claimed = await tx.order.updateMany({
    where: { id: orderId, restockedAt: null, fulfilledAt: { not: null } },
    data: { restockedAt: new Date() },
  });
  if (claimed.count === 0) return false;

  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const item of items) {
    if (item.productId == null) continue;
    await recordMovement(tx, {
      productId: item.productId,
      variantId: item.variantId,
      type: "RETURN",
      delta: item.quantity,
      unitCost: item.purchaseCost,
      orderId,
      actorName,
    });
  }
  return true;
}
