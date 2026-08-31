import type { ProductStatus, PurchaseOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { availableOf } from "@/server/inventory/reservations";

/**
 * What a supplier has sold us, seen from the CATALOGUE side.
 *
 * The duplicate-product problem this exists to close: goods arrive on a
 * purchase order, which creates a DRAFT product carrying a name, a cost and a
 * quantity but no price and no content. The admin then opens "New product" to
 * put it on sale — and creates a SECOND Product row for the same shirt. The
 * shop now holds two records: one with the stock and the purchase history, one
 * with the price and the photos, and neither of them is the truth.
 *
 * So this answers "what have I bought from this supplier that still needs
 * finishing?" at the top of the create screen. Every figure is DERIVED from
 * PurchaseOrderLine -> PurchaseOrder.supplierId; nothing is stored, so a
 * product bought from two suppliers correctly appears under both.
 *
 * Read-only by design: choosing a row navigates to that product's edit page,
 * which is where prices, listing quantities and content already live.
 */

/** The most recent purchase of a product FROM THE SUPPLIER BEING BROWSED. */
export interface SupplierProductPurchase {
  poId: number;
  poNo: string;
  status: PurchaseOrderStatus;
  /** Received where known, else ordered, else when the row was written. */
  on: Date;
  /** Written after the fact — the cost is recalled, not captured. */
  isBackfill: boolean;
  /** Paisa per unit, from that purchase's line. */
  unitCost: number;
  /**
   * TRUE once the line has been received, because receiving rewrites unitCost
   * to the LANDED cost — freight, customs and labour apportioned in. Until
   * then it is still only the price the supplier quoted, and calling that
   * landed would understate what the unit really cost to put on the shelf.
   */
  isLanded: boolean;
}

export interface SupplierProductRow {
  productId: number;
  name: string;
  status: ProductStatus;
  /** First photo, for recognition. Null when the product has none yet. */
  imageUrl: string | null;
  /** Sellable options. 0 = the product is sold as a single item. */
  variantCount: number;

  /**
   * Paisa — the cheapest price a shopper would actually pay, across every row
   * that has one. NULL means no price is set anywhere, which is the normal
   * state of a product created by the purchasing flow.
   */
  price: number | null;
  /** Rows still sitting at zero. A product is only finished when this is 0. */
  unpricedOptions: number;

  /** Physically on hand, summed the way the rest of the app sums it. */
  onHand: number;
  /** Promised to orders that have neither shipped nor died. */
  reserved: number;
  /** Units authorised for sale. NULL = uncapped, which is not the same as 0. */
  listedQty: number | null;
  /** What a shopper can buy right now: min(stock − reserved, listedQty ?? ∞). */
  available: number;

  /** Units bought from THIS supplier, across every non-cancelled order. */
  unitsPurchased: number;
  /** Ordered from this supplier and not yet arrived. */
  incoming: number;
  lastPurchase: SupplierProductPurchase;
}

/**
 * Every product this supplier has been ordered from, newest purchase first,
 * with unfinished DRAFTs lifted to the top.
 *
 * DRAFT first because that is the queue this screen exists to work through: a
 * draft is a product that reached the warehouse and never reached the
 * storefront. Published products stay in the list underneath — buying more of
 * something already on sale is a real reason to arrive here, and hiding those
 * rows would push the admin straight back to the button that creates the
 * duplicate.
 *
 * Cancelled orders are excluded throughout: they record an intention that came
 * to nothing, so they say nothing about where any goods came from.
 */
export async function listSupplierProducts(supplierId: number): Promise<SupplierProductRow[]> {
  const lines = await prisma.purchaseOrderLine.findMany({
    where: { purchaseOrder: { supplierId, status: { not: "CANCELLED" } } },
    select: {
      productId: true,
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
        },
      },
    },
    // Highest id first, so the first line seen for a product is its newest.
    orderBy: { id: "desc" },
  });
  if (lines.length === 0) return [];

  const latest = new Map<number, SupplierProductPurchase>();
  const purchased = new Map<number, number>();
  const incoming = new Map<number, number>();

  for (const line of lines) {
    const po = line.purchaseOrder;
    purchased.set(line.productId, (purchased.get(line.productId) ?? 0) + line.quantity);
    incoming.set(
      line.productId,
      (incoming.get(line.productId) ?? 0) + Math.max(0, line.quantity - line.receivedQty),
    );
    if (latest.has(line.productId)) continue;
    latest.set(line.productId, {
      poId: po.id,
      poNo: po.poNo,
      status: po.status,
      on: po.receivedAt ?? po.orderedAt ?? po.createdAt,
      isBackfill: po.isBackfill,
      unitCost: line.unitCost,
      isLanded: line.receivedQty > 0,
    });
  }

  // One query for the products behind those lines, rather than joining the
  // product onto every line: a supplier ordered from monthly would otherwise
  // send the same product — and its whole variant list — back a dozen times.
  const products = await prisma.product.findMany({
    where: { id: { in: [...latest.keys()] } },
    select: {
      id: true,
      name: true,
      status: true,
      price: true,
      discountPrice: true,
      stock: true,
      reserved: true,
      listedQty: true,
      variants: {
        select: { price: true, discountPrice: true, stock: true, reserved: true, listedQty: true },
        orderBy: { sortOrder: "asc" },
      },
      images: {
        select: { url: true },
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        take: 1,
      },
    },
  });

  const rows: SupplierProductRow[] = products.map((p) => {
    // A product whose options carry stock reports PER OPTION, and its
    // product-level row is vestigial — the same rule getListingRows() applies,
    // so this screen and the edit screen can never disagree about what is on
    // hand or how much of it is listed.
    const sized = p.variants.length > 0;
    const stockRows = sized
      ? p.variants.map((v) => ({ stock: v.stock, reserved: v.reserved, listedQty: v.listedQty }))
      : [{ stock: p.stock, reserved: p.reserved, listedQty: p.listedQty }];

    const priceRows = sized
      ? p.variants.map((v) => v.discountPrice ?? v.price)
      : [p.discountPrice ?? p.price];
    const priced = priceRows.filter((v) => v > 0);
    const capped = stockRows.filter((r) => r.listedQty != null);

    return {
      productId: p.id,
      name: p.name,
      status: p.status,
      imageUrl: p.images[0]?.url ?? null,
      variantCount: p.variants.length,
      price: priced.length > 0 ? Math.min(...priced) : null,
      unpricedOptions: priceRows.length - priced.length,
      onHand: stockRows.reduce((s, r) => s + r.stock, 0),
      reserved: stockRows.reduce((s, r) => s + r.reserved, 0),
      // Null only when NOTHING is capped: "everything on hand is for sale" is a
      // different statement from "zero units are listed", and rendering the
      // first as the second would read as a product deliberately taken off sale.
      listedQty: capped.length === 0 ? null : capped.reduce((s, r) => s + (r.listedQty ?? 0), 0),
      available: stockRows.reduce((s, r) => s + availableOf(r), 0),
      unitsPurchased: purchased.get(p.id) ?? 0,
      incoming: incoming.get(p.id) ?? 0,
      lastPurchase: latest.get(p.id)!,
    };
  });

  const rank = (s: ProductStatus) => (s === "DRAFT" ? 0 : s === "INACTIVE" ? 1 : 2);
  return rows.sort(
    (a, b) =>
      rank(a.status) - rank(b.status) ||
      b.lastPurchase.on.getTime() - a.lastPurchase.on.getTime() ||
      a.name.localeCompare(b.name),
  );
}
