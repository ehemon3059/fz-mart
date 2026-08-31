import type { Prisma, StockMovementType } from "@prisma/client";

// THE inventory ledger writer. Every change to a stock level in this codebase
// goes through recordMovement() — checkout, restock, return, manual
// adjustment — so StockMovement is a complete history rather than a partial
// one.
//
// Two rules make the ledger trustworthy, and both are enforced here:
//
//  1. The movement and the stock update are ONE atomic act. recordMovement
//     performs both, and only accepts a transaction client, so a caller cannot
//     write a movement whose effect didn't land (or an effect nobody recorded).
//
//  2. beforeQty/afterQty come from the WRITE, never from a prior read. Under
//     TiDB's REPEATABLE READ a read-then-write would let two concurrent
//     movements observe the same "before" and record a history that never
//     happened. See the note on the increment path below.

type TxClient = Prisma.TransactionClient;

export interface MovementInput {
  productId: number;
  /** The variant that moved, if the product is sized. Null = product-level stock. */
  variantId?: number | null;
  type: StockMovementType;
  /** Signed change: positive adds to stock, negative removes. Never zero. */
  delta: number;
  /** Per-unit cost in paisa at this moment; null when there is no cost basis. */
  unitCost?: number | null;
  /** The order responsible, for SALE / CANCEL_RESTOCK / RETURN. */
  orderId?: number | null;
  /** Human explanation, for admin-initiated movements. */
  reason?: string | null;
  /** Admin username, "customer", or "system". */
  actorName: string;
  /**
   * Where the stock physically moved, when the shop keeps more than one
   * location. Omitted/null for the movements nobody can place — a customer
   * order shipping, historical rows — which is why it is nullable rather than
   * defaulted to the main location: a guess here would be repeated as fact by
   * every per-location report.
   */
  locationId?: number | null;
}

export class LedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LedgerError";
  }
}

/**
 * Apply a stock change and record it, atomically.
 *
 * Returns the resulting level. Throws if the change would drive stock negative
 * — that is a real bug (an oversell, or a double restock), and silently
 * clamping it would hide the very drift this ledger exists to expose.
 *
 * IMPORTANT: callers must already be inside a transaction, and must NOT have
 * applied the stock change themselves — this function owns both halves.
 */
export async function recordMovement(
  tx: TxClient,
  input: MovementInput,
): Promise<number> {
  const { productId, variantId, type, delta, unitCost, orderId, reason, actorName, locationId } =
    input;

  if (!Number.isInteger(delta) || delta === 0) {
    throw new LedgerError("A stock movement must have a non-zero whole delta.");
  }

  const id = variantId ?? productId;
  const target = variantId != null ? `variant ${variantId}` : `product ${productId}`;

  // Either way the stock level below comes from the WRITE, not from a prior
  // read. Deriving `before` by subtraction (rather than reading it first) is
  // what keeps the pair honest: whatever else raced us, this row's own change
  // is exactly `delta`, so after − delta is the level this movement actually
  // started from.
  let afterQty: number;

  if (delta > 0) {
    // A credit cannot drive stock negative, so it needs no conditional guard —
    // and that lets a plain `update` apply the increment AND return the
    // resulting row in ONE round trip. Worth doing rather than mirroring the
    // decrement path: this runs inside an interactive transaction against a
    // remote database, a goods receipt calls it once per line, and every saved
    // round trip is transaction budget that is no longer at risk of running out
    // half way through a delivery.
    try {
      afterQty =
        variantId != null
          ? (
              await tx.productVariant.update({
                where: { id },
                data: { stock: { increment: delta } },
                select: { stock: true },
              })
            ).stock
          : (
              await tx.product.update({
                where: { id },
                data: { stock: { increment: delta } },
                select: { stock: true },
              })
            ).stock;
    } catch (err) {
      // P2025 = the row is gone. Anything else (a dropped connection, an
      // expired transaction) is not ours to reinterpret — rethrow it as-is so
      // the real fault is not disguised as a missing product.
      if ((err as { code?: string }).code !== "P2025") throw err;
      throw new LedgerError(`Stock movement rejected: ${target} no longer exists.`);
    }
  } else {
    // Removing stock DOES need the CONDITIONAL, atomic guard. `stock: { gte }`
    // is what makes this safe under concurrency: it both prevents a negative
    // result and tells us the write actually happened, without a separate read
    // that another transaction could invalidate. This is the same pattern
    // checkout already uses to prevent overselling.
    const where = { id, stock: { gte: -delta } };
    const updated =
      variantId != null
        ? await tx.productVariant.updateMany({ where, data: { stock: { increment: delta } } })
        : await tx.product.updateMany({ where, data: { stock: { increment: delta } } });

    if (updated.count === 0) {
      throw new LedgerError(
        `Stock movement rejected: ${type} of ${delta} would take ${target} below zero.`,
      );
    }

    afterQty =
      variantId != null
        ? (
            await tx.productVariant.findUniqueOrThrow({
              where: { id: variantId },
              select: { stock: true },
            })
          ).stock
        : (
            await tx.product.findUniqueOrThrow({
              where: { id: productId },
              select: { stock: true },
            })
          ).stock;
  }

  await tx.stockMovement.create({
    data: {
      productId,
      variantId: variantId ?? null,
      type,
      delta,
      beforeQty: afterQty - delta,
      afterQty,
      unitCost: unitCost ?? null,
      orderId: orderId ?? null,
      reason: reason?.trim() || null,
      actorName,
      locationId: locationId ?? null,
    },
  });

  return afterQty;
}

/**
 * Record a return whose goods came back too damaged to resell.
 *
 * Net stock is unchanged, but that is NOT the same as nothing happening: the
 * parcel physically returned and the goods were then written off. Recording the
 * pair (RETURN +N, DAMAGE −N) keeps two things true that a single silent no-op
 * would lose —
 *
 *   • the write-off is countable, so damaged goods can be totalled and valued
 *     rather than inferred from an absence of entries;
 *   • the ledger still replays to the correct level, because the two rows
 *     cancel.
 *
 * The DAMAGE row carries the checkout-snapshotted cost, so the loss is valued
 * at what the units actually cost, not today's supplier price.
 *
 * Idempotent via the same Order.restockedAt claim the restock paths use — a
 * damaged return must not be written twice if the transition is somehow
 * re-entered.
 */
export async function recordDamagedReturn(
  tx: TxClient,
  orderId: number,
  actorName: string,
): Promise<boolean> {
  const claimed = await tx.order.updateMany({
    where: { id: orderId, restockedAt: null },
    data: { restockedAt: new Date() },
  });
  if (claimed.count === 0) return false; // already settled by another path

  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const item of items) {
    if (item.productId == null) continue;

    // In, then straight back out. Order matters: crediting first means the
    // DAMAGE row can never be rejected by the not-below-zero guard, even for a
    // product that is currently at zero on the shelf.
    await recordMovement(tx, {
      productId: item.productId,
      variantId: item.variantId,
      type: "RETURN",
      delta: item.quantity,
      unitCost: item.purchaseCost,
      orderId,
      reason: "Returned damaged",
      actorName,
    });
    await recordMovement(tx, {
      productId: item.productId,
      variantId: item.variantId,
      type: "DAMAGE",
      delta: -item.quantity,
      unitCost: item.purchaseCost,
      orderId,
      reason: "Written off — not resellable",
      actorName,
    });
  }
  return true;
}
