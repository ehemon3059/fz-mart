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
 * What a shopper may actually buy: on hand, minus what is promised to other
 * unshipped orders, minus whatever the admin has chosen not to list.
 *
 * THE definition of availability — every storefront surface (product page, cart
 * validation, back-in-stock checks) must go through this rather than reading
 * `stock` directly, or it will offer units that are already spoken for.
 *
 * TWO INDEPENDENT LIMITS, and the smaller always wins:
 *
 *   stock − reserved   what the warehouse can actually ship
 *   listedQty          what the admin has authorised for sale (null = all)
 *
 * Taking the MINIMUM is what keeps the cap honest in both directions: a listing
 * can never conjure units the shelf doesn't have, and the shelf can never sell
 * units nobody listed. It also makes the cap self-correcting — write off 60 of
 * 100 units while 50 are listed and availability becomes 40, with no cleanup.
 *
 * Both halves are floored at zero so a negative counter (which shouldn't
 * happen, but would be a counter bug rather than a shopper's problem) reads as
 * sold out instead of poisoning the minimum.
 */
export function availableOf(row: {
  stock: number;
  reserved: number;
  /** Units authorised for sale. Null/undefined = uncapped — sell everything. */
  listedQty?: number | null;
}): number {
  const onShelf = Math.max(0, row.stock - row.reserved);
  if (row.listedQty == null) return onShelf;
  return Math.min(onShelf, Math.max(0, row.listedQty));
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
 * The listing cap is enforced by the SAME statement, for the same reason: a
 * second predicate (`listedQty >= quantity`) rather than a read-then-write, so
 * two shoppers racing for the last LISTED unit resolve exactly like two racing
 * for the last physical one. Checking it separately would reintroduce the race
 * this function exists to close.
 *
 * `listedQty` is decremented in step with the reservation, which is what makes
 * it read as "how many more may still be sold". NULL is left NULL — an uncapped
 * row stays uncapped forever, and `CASE WHEN … IS NULL` is what keeps arithmetic
 * off it (NULL − 1 would silently become NULL and quietly uncap the row).
 *
 * Returns false when there is not enough available — the caller turns that into
 * the "just sold out" message. A cap of zero fails here exactly like an empty
 * shelf does, which is the intent: to a shopper, "not for sale" and "sold out"
 * are the same answer.
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
          SET reserved = reserved + ${quantity},
              listedQty = CASE WHEN listedQty IS NULL THEN NULL ELSE listedQty - ${quantity} END
          WHERE id = ${variantId}
            AND stock - reserved >= ${quantity}
            AND (listedQty IS NULL OR listedQty >= ${quantity})
        `
      : await tx.$executeRaw`
          UPDATE Product
          SET reserved = reserved + ${quantity},
              listedQty = CASE WHEN listedQty IS NULL THEN NULL ELSE listedQty - ${quantity} END
          WHERE id = ${productId}
            AND stock - reserved >= ${quantity}
            AND (listedQty IS NULL OR listedQty >= ${quantity})
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
    // creditListing=false: these units shipped. The allowance paid for them.
    await releaseReservationRow(tx, item.productId, item.variantId, item.quantity, false);

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
    // creditListing=true: the order died, so the units go back on sale.
    await releaseReservationRow(tx, item.productId, item.variantId, item.quantity, true);
  }
  return true;
}

/**
 * Lower `reserved` on one stock row, floored at zero, and hand the listing
 * allowance back.
 *
 * The GREATEST(...) floor is deliberate belt-and-braces: reserved should never
 * go negative because every release is paired with a reservation, but a floor
 * means that if it ever did (a bad backfill, a manual DB edit) the counter
 * self-heals toward zero instead of poisoning availability for every future
 * shopper.
 *
 * `creditListing` decides whether the listing allowance comes back, and the two
 * callers of this helper need OPPOSITE answers — which is exactly why it is a
 * parameter rather than something this function decides for itself:
 *
 *   releaseOrder (cancelled)  true  — the order died, the units were never
 *                                     sold, so the authorisation to sell them
 *                                     was never spent. Without this every
 *                                     cancellation would quietly shrink the
 *                                     listing until the storefront closed
 *                                     itself.
 *   fulfilOrder  (shipped)    false — shipping SPENDS the allowance. Crediting
 *                                     it here would re-authorise units that
 *                                     have physically left the building, and
 *                                     the cap would never fall.
 *
 * A return of already-shipped goods is a third case and also does not credit
 * (see returnFulfilledOrder): the units come back to the shelf, but re-listing
 * them stays a decision for the admin.
 */
async function releaseReservationRow(
  tx: TxClient,
  productId: number,
  variantId: number | null,
  quantity: number,
  creditListing: boolean,
): Promise<void> {
  // NULL stays NULL: an uncapped row must never acquire a cap by arithmetic.
  const credit = creditListing ? quantity : 0;
  if (variantId != null) {
    await tx.$executeRaw`
      UPDATE ProductVariant
      SET reserved = GREATEST(reserved - ${quantity}, 0),
          listedQty = CASE WHEN listedQty IS NULL THEN NULL ELSE listedQty + ${credit} END
      WHERE id = ${variantId}
    `;
  } else {
    await tx.$executeRaw`
      UPDATE Product
      SET reserved = GREATEST(reserved - ${quantity}, 0),
          listedQty = CASE WHEN listedQty IS NULL THEN NULL ELSE listedQty + ${credit} END
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
