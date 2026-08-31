import { prisma } from "@/lib/prisma";

// How many of the units on hand are offered for sale.
//
// This module is deliberately NOT part of the ledger, and lives beside it
// rather than inside it to keep that boundary obvious:
//
//   ledger.ts   what the warehouse HOLDS. Every write is a StockMovement.
//   listing.ts  what the shop OFFERS. No write is a StockMovement, ever.
//
// Listing 50 of 100 units moves nothing. No goods arrive, none leave, none are
// damaged or counted — the shop simply decides how much of its position to put
// on the shelf. Recording that as a stock movement would be a lie the ledger
// then has to carry forever, and scripts/stock-ledger-verify.ts would report
// drift for a shipment that never happened.
//
// So the audit trail for this lives in AdminActivityLog, next to the other
// catalogue decisions (price changes, publishing), which is what it is.
//
// AVAILABLE = min(stock − reserved, listedQty ?? ∞). See availableOf() in
// reservations.ts — that function is the single definition, and everything
// here exists only to set the cap it reads.

export class ListingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ListingError";
  }
}

/** One stock row's listing state, as the admin screen shows it. */
export interface ListingRow {
  variantId: number | null;
  label: string;
  /** Physically on hand — ledger-owned, never written here. */
  stock: number;
  /** Promised to orders that have neither shipped nor died. */
  reserved: number;
  /** Units still authorised for sale. Null = uncapped. */
  listedQty: number | null;
  /** The most this row may be listed at right now: stock − reserved. */
  maxListable: number;
  /** What a shopper can buy: min(stock − reserved, listedQty ?? ∞). */
  available: number;
  /** On hand, physically present, but deliberately not for sale. */
  heldBack: number;
}

function rowOf(
  variantId: number | null,
  label: string,
  stock: number,
  reserved: number,
  listedQty: number | null,
): ListingRow {
  const maxListable = Math.max(0, stock - reserved);
  const available = listedQty == null ? maxListable : Math.min(maxListable, Math.max(0, listedQty));
  return {
    variantId,
    label,
    stock,
    reserved,
    listedQty,
    maxListable,
    available,
    // What is on the shelf and could be sold, but isn't offered. Zero for an
    // uncapped row by definition — nothing is being held back there.
    heldBack: Math.max(0, maxListable - available),
  };
}

/**
 * Every stock row of a product with its listing state.
 *
 * Keyed the way the rest of the app keys stock: a product whose options carry
 * stock reports per option and its product-level row is not included at all,
 * because that row is vestigial for such a product (see lib/product-stock.ts).
 * That is what makes Product.listedQty and ProductVariant.listedQty incapable
 * of contradicting each other — only one of them is ever read, and this
 * function is where that choice is made for the admin screen.
 */
export async function getListingRows(productId: number): Promise<ListingRow[]> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      stock: true,
      reserved: true,
      listedQty: true,
      variants: {
        select: {
          id: true,
          size: true,
          colorName: true,
          stock: true,
          reserved: true,
          listedQty: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!product) throw new ListingError("That product no longer exists.");

  if (product.variants.length > 0) {
    return product.variants.map((v) =>
      rowOf(
        v.id,
        [v.colorName, v.size].filter(Boolean).join(" / ") || "Option",
        v.stock,
        v.reserved,
        v.listedQty,
      ),
    );
  }
  return [rowOf(null, "All units", product.stock, product.reserved, product.listedQty)];
}

export interface ListingUpdate {
  variantId: number | null;
  /** Units to authorise for sale. Null = uncapped (sell everything on hand). */
  listedQty: number | null;
}

/**
 * Set how many units are offered for sale, for one or more stock rows.
 *
 * THE INVARIANT: a listing may never exceed what the shelf can actually ship.
 *
 *     listedQty <= stock − reserved
 *
 * `reserved` is subtracted because those units are already promised to orders
 * that haven't shipped; listing them again would be selling the same unit
 * twice. Checked per row and rejected with the offending row named, rather than
 * silently clamped — a shop that asked to list 120 of 100 has made a mistake
 * worth seeing, and quietly listing 100 would hide it.
 *
 * REDUCING is always safe and always allowed, including below what is currently
 * reserved: existing orders live in `reserved`, which this never touches, so
 * they still ship. Lowering the cap only limits FUTURE sales. Setting it to 0
 * takes the product off sale immediately while orders in flight complete
 * normally.
 *
 * Everything happens in one transaction so a multi-option product can't end up
 * half-listed, and NOTHING here writes `stock` or a StockMovement.
 */
export async function setListedQuantities(
  productId: number,
  updates: ListingUpdate[],
): Promise<void> {
  if (updates.length === 0) return;

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true, stock: true, reserved: true },
    });
    if (!product) throw new ListingError("That product no longer exists.");

    for (const update of updates) {
      const qty = update.listedQty;
      if (qty != null && (!Number.isInteger(qty) || qty < 0)) {
        throw new ListingError("Quantity for sale must be a whole number, zero or more.");
      }

      if (update.variantId != null) {
        // Re-read inside the transaction: the figure the admin saw may be
        // minutes old, and an order placed since then has already claimed some
        // of it. Under TiDB's REPEATABLE READ this row is the one the write
        // below lands on, so validating against it is validating against what
        // will actually be true.
        const variant = await tx.productVariant.findUnique({
          where: { id: update.variantId },
          select: { id: true, productId: true, size: true, colorName: true, stock: true, reserved: true },
        });
        if (!variant || variant.productId !== productId) {
          throw new ListingError("An option no longer belongs to this product.");
        }
        const max = Math.max(0, variant.stock - variant.reserved);
        if (qty != null && qty > max) {
          const label = [variant.colorName, variant.size].filter(Boolean).join(" / ") || "this option";
          throw new ListingError(
            `You only have ${max} unit(s) available in inventory for ${label}.` +
              (variant.reserved > 0
                ? ` (${variant.stock} on hand, ${variant.reserved} already promised to open orders.)`
                : ""),
          );
        }
        await tx.productVariant.update({
          where: { id: update.variantId },
          data: { listedQty: qty },
        });
      } else {
        const max = Math.max(0, product.stock - product.reserved);
        if (qty != null && qty > max) {
          throw new ListingError(
            `You only have ${max} unit(s) available in inventory.` +
              (product.reserved > 0
                ? ` (${product.stock} on hand, ${product.reserved} already promised to open orders.)`
                : ""),
          );
        }
        await tx.product.update({ where: { id: productId }, data: { listedQty: qty } });
      }
    }
  });
}

// ── Product overview: listing state + where the goods came from ─────────────

/** Where a product's units came from, for the admin's sourcing panel. */
export interface ListingSourcing {
  supplierName: string;
  poNo: string;
  poId: number;
  on: Date;
  /** Written after the fact — the cost is recalled, not captured. */
  isBackfill: boolean;
  /** Paisa, per unit, from the most recent purchase line. */
  landedCost: number;
}

export interface ListingTotals {
  /** Physically on hand across every stock row. */
  onHand: number;
  /** Promised to orders that have neither shipped nor died. */
  reserved: number;
  /**
   * Units authorised for sale. Null when NO row carries a cap — meaning
   * "everything available is for sale", which is a different statement from a
   * total of zero and must not be rendered as one.
   */
  listed: number | null;
  /** What a shopper can actually buy right now. */
  available: number;
  /** On the shelf, free of reservations, but deliberately not offered. */
  heldBack: number;
  /** Units ever received into stock, per the ledger. */
  purchased: number;
  /** Units ever sold and shipped, per the ledger. */
  sold: number;
  /** Ordered from a supplier but not yet arrived. */
  incoming: number;
}

export interface ProductListingOverview {
  rows: ListingRow[];
  totals: ListingTotals;
  sourcing: ListingSourcing | null;
}

/**
 * Everything the product edit screen needs to answer "what do I have, what did
 * it cost, and how much of it am I selling?".
 *
 * Every figure is DERIVED — from the ledger for what moved, from purchase
 * orders for what was bought, from the stock rows for what is listed. Nothing
 * here is a stored summary, so nothing here can drift out of step with the
 * ledger the way a cached total would.
 */
export async function getProductListingOverview(
  productId: number,
): Promise<ProductListingOverview> {
  const rows = await getListingRows(productId);

  const [movements, lines] = await Promise.all([
    // The ledger is the authority on what actually arrived and what actually
    // left — not the purchase orders, which record intent, and not the order
    // table, which includes orders that never shipped.
    prisma.stockMovement.groupBy({
      by: ["type"],
      where: { productId },
      _sum: { delta: true },
    }),
    prisma.purchaseOrderLine.findMany({
      where: { productId, purchaseOrder: { status: { not: "CANCELLED" } } },
      select: {
        quantity: true,
        receivedQty: true,
        unitCost: true,
        purchaseOrder: {
          select: {
            id: true,
            poNo: true,
            status: true,
            isBackfill: true,
            orderedAt: true,
            receivedAt: true,
            createdAt: true,
            supplier: { select: { name: true } },
          },
        },
      },
      orderBy: { id: "desc" },
    }),
  ]);

  const sumOf = (type: string) =>
    movements.find((m) => m.type === type)?._sum.delta ?? 0;

  // PURCHASE and OPENING both put units on the shelf: one from a supplier
  // delivery, one from the balance the shop already held when it started
  // tracking. Both are "units that arrived", which is what this figure means.
  const purchased = sumOf("PURCHASE") + sumOf("OPENING");
  // SALE deltas are negative; report the magnitude.
  const sold = Math.abs(sumOf("SALE"));
  const incoming = lines.reduce((s, l) => s + Math.max(0, l.quantity - l.receivedQty), 0);

  const capped = rows.filter((r) => r.listedQty != null);

  const totals: ListingTotals = {
    onHand: rows.reduce((s, r) => s + r.stock, 0),
    reserved: rows.reduce((s, r) => s + r.reserved, 0),
    // Null only when nothing is capped anywhere — see the field's note.
    listed: capped.length === 0 ? null : capped.reduce((s, r) => s + (r.listedQty ?? 0), 0),
    available: rows.reduce((s, r) => s + r.available, 0),
    heldBack: rows.reduce((s, r) => s + r.heldBack, 0),
    purchased,
    sold,
    incoming,
  };

  const latest = lines[0]?.purchaseOrder;
  const sourcing: ListingSourcing | null = latest
    ? {
        supplierName: latest.supplier.name,
        poNo: latest.poNo,
        poId: latest.id,
        on: latest.receivedAt ?? latest.orderedAt ?? latest.createdAt,
        isBackfill: latest.isBackfill,
        landedCost: lines[0].unitCost,
      }
    : null;

  return { rows, totals, sourcing };
}
