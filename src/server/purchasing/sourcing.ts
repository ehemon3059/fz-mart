import type { ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PurchasingError, TX_OPTIONS, nextPoNo } from "./index";

/**
 * Buy & Sell Equal — pairing what the shop SELLS against what it BOUGHT.
 *
 * The gap this closes: a product can enter the catalogue through two doors, and
 * only one of them records where the goods came from. Created from a purchase
 * order, a product carries a supplier, a quantity and a cost. Created straight
 * on the selling side so it could go live on the storefront, it carries none of
 * that — it just appears, sells, and leaves no answer to "who did we buy this
 * from, how many, at what price".
 *
 * Nothing in the schema was wrong; the supply side was simply invisible. So
 * this module derives one fact per product — is there a purchase behind it? —
 * and offers the one write that fixes a "no" without disturbing anything else.
 */

/** The most recent non-cancelled purchase that explains a product. */
export interface SourcingLastPurchase {
  poId: number;
  poNo: string;
  supplierName: string;
  /** Received date where known, else ordered, else when the row was written. */
  on: Date;
  /** Written after the fact — the cost is recalled, not captured. */
  isBackfill: boolean;
}

export interface SourcingRow {
  productId: number;
  name: string;
  status: ProductStatus;
  /** Paisa — what a customer actually pays today (the discount when set). */
  price: number;
  /** Paisa — the struck-through regular price, or null when not discounted. */
  wasPrice: number | null;
  /** On hand. Summed over variants when the product is sized, since that is
   *  where a sized product's stock actually lives. */
  stock: number;
  variantCount: number;
  /** FALSE = sold on the storefront with no purchase behind it. The queue. */
  sourced: boolean;
  /** Units ever bought, across every non-cancelled order. */
  unitsPurchased: number;
  lastPurchase: SourcingLastPurchase | null;
}

/**
 * Every product, paired with the purchase history behind it.
 *
 * "Sourced" deliberately means *any* non-cancelled purchase order line, not a
 * received one: an order that has been placed but not yet delivered still
 * answers where the goods are coming from, which is the question being asked.
 * A cancelled order answers nothing, so it does not count.
 */
export async function listProductSourcing(): Promise<SourcingRow[]> {
  const [products, lines] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        price: true,
        discountPrice: true,
        stock: true,
        // Only the stock figure — the panel fetches full variant detail for the
        // one product it is opened on, so the list stays cheap.
        variants: { select: { stock: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.purchaseOrderLine.findMany({
      where: { purchaseOrder: { status: { not: "CANCELLED" } } },
      select: {
        productId: true,
        quantity: true,
        purchaseOrder: {
          select: {
            id: true,
            poNo: true,
            isBackfill: true,
            orderedAt: true,
            receivedAt: true,
            createdAt: true,
            supplier: { select: { name: true } },
          },
        },
      },
      // Highest id first, so the first row seen per product is the newest.
      orderBy: { id: "desc" },
    }),
  ]);

  const latest = new Map<number, SourcingLastPurchase>();
  const units = new Map<number, number>();

  for (const line of lines) {
    units.set(line.productId, (units.get(line.productId) ?? 0) + line.quantity);
    if (latest.has(line.productId)) continue;
    const po = line.purchaseOrder;
    latest.set(line.productId, {
      poId: po.id,
      poNo: po.poNo,
      supplierName: po.supplier.name,
      on: po.receivedAt ?? po.orderedAt ?? po.createdAt,
      isBackfill: po.isBackfill,
    });
  }

  return products.map((p) => {
    const sized = p.variants.length > 0;
    return {
      productId: p.id,
      name: p.name,
      status: p.status,
      price: p.discountPrice ?? p.price,
      wasPrice: p.discountPrice != null ? p.price : null,
      stock: sized ? p.variants.reduce((s, v) => s + v.stock, 0) : p.stock,
      variantCount: p.variants.length,
      sourced: latest.has(p.id),
      unitsPurchased: units.get(p.id) ?? 0,
      lastPurchase: latest.get(p.id) ?? null,
    };
  });
}

/** One sellable option, as the Add Purchase panel needs to show it. */
export interface BackfillOption {
  variantId: number | null;
  label: string;
  /** On hand now — offered as the default quantity, see the panel. */
  stock: number;
  /** Paisa, 0 = never recorded. */
  purchaseCost: number;
  /** Paisa — what this option sells for, so buy and sell sit side by side. */
  price: number;
}

export interface BackfillTarget {
  productId: number;
  name: string;
  options: BackfillOption[];
}

/**
 * The one product the panel is opened on, shaped for entry.
 *
 * A sized product gets a row per variant, because that is where quantity, cost,
 * colour and size actually differ — you buy 20 Navy/M and 5 Red/XL at two
 * different prices, and a single product-level figure cannot hold that.
 */
export async function getBackfillTarget(productId: number): Promise<BackfillTarget | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      price: true,
      discountPrice: true,
      stock: true,
      purchaseCost: true,
      variants: {
        select: {
          id: true,
          size: true,
          colorName: true,
          stock: true,
          price: true,
          discountPrice: true,
          purchaseCost: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!product) return null;

  const options: BackfillOption[] =
    product.variants.length > 0
      ? product.variants.map((v) => ({
          variantId: v.id,
          label: [v.colorName, v.size].filter(Boolean).join(" / ") || "Option",
          stock: v.stock,
          // 0 on a variant means "inherit the product's", so fall back rather
          // than showing an empty cost box for a product that has one.
          purchaseCost: v.purchaseCost || product.purchaseCost,
          price: v.discountPrice ?? v.price,
        }))
      : [
          {
            variantId: null,
            label: "All units",
            stock: product.stock,
            purchaseCost: product.purchaseCost,
            price: product.discountPrice ?? product.price,
          },
        ];

  return { productId: product.id, name: product.name, options };
}

export interface HistoricalPurchaseLineInput {
  variantId: number | null;
  quantity: number;
  /** Paisa. */
  unitCost: number;
}

export interface HistoricalPurchaseInput {
  productId: number;
  supplierId: number;
  /** When the goods were actually bought. Defaults to now. */
  purchasedOn?: Date | null;
  note?: string | null;
  lines: HistoricalPurchaseLineInput[];
}

/**
 * Record a purchase that already happened, for goods already on the shelf.
 *
 * THE INVARIANT, and the whole reason this is not just "create a PO and receive
 * it": A BACKFILL NEVER MOVES STOCK. These units were counted long ago — they
 * are why the product shows 50 on hand in the first place. Running them through
 * the ledger a second time would say they arrived twice and leave the shop
 * believing it holds 100. So there is no recordMovement() call and no `stock`
 * write; the lines are simply created already-received, because they were.
 *
 * That makes this the one place in purchasing that writes a received line
 * without a matching StockMovement, which is exactly what `isBackfill` marks.
 * The ledger stays honest — it never claims goods arrived on a day they did
 * not — and the order stays honest about having been written from memory.
 *
 * Cost is filled in only where none was known. A figure recalled months later
 * is weaker evidence than one captured at the time, so it may answer "we had no
 * idea what this cost" but must never overwrite an answer already on record.
 */
export async function recordHistoricalPurchase(input: HistoricalPurchaseInput) {
  const entered = input.lines.filter((l) => l.quantity > 0);
  if (entered.length === 0) {
    throw new PurchasingError("Enter how many units you bought for at least one option.");
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: input.productId },
      select: { id: true, name: true, purchaseCost: true },
    });
    if (!product) throw new PurchasingError("That product no longer exists.");

    const supplier = await tx.supplier.findUnique({
      where: { id: input.supplierId },
      select: { id: true, name: true },
    });
    if (!supplier) throw new PurchasingError("Choose the supplier this was bought from.");

    // Every option this backfill touches, read in ONE round trip rather than
    // one per line: the database is remote, and a per-line lookup is what puts
    // this transaction anywhere near its ceiling in the first place.
    const variantIds = entered
      .map((l) => l.variantId)
      .filter((id): id is number => id != null);
    const variants = variantIds.length
      ? await tx.productVariant.findMany({
          where: { id: { in: variantIds }, productId: product.id },
          select: { id: true, size: true, colorName: true, purchaseCost: true },
        })
      : [];
    const variantById = new Map(variants.map((v) => [v.id, v]));

    const lines = [];
    for (const line of entered) {
      let variantLabel: string | null = null;
      if (line.variantId != null) {
        // Scoped to this product in the `where` above, so a missing row means
        // either gone or never ours — the same answer either way.
        const variant = variantById.get(line.variantId);
        if (!variant) {
          throw new PurchasingError("An option no longer belongs to this product.");
        }
        variantLabel = [variant.colorName, variant.size].filter(Boolean).join(" / ") || null;
      }
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
        throw new PurchasingError("Quantity must be a positive whole number.");
      }
      if (!Number.isFinite(line.unitCost) || line.unitCost < 0) {
        throw new PurchasingError("Unit cost can't be negative.");
      }
      lines.push({
        productId: product.id,
        variantId: line.variantId ?? null,
        // Snapshotted for the same reason a live PO snapshots them: a later
        // rename must not rewrite what the paperwork said at the time.
        productName: product.name,
        variantLabel,
        quantity: line.quantity,
        // Already received — these goods arrived before this row was written.
        receivedQty: line.quantity,
        unitCost: Math.round(line.unitCost),
      });
    }

    const on = input.purchasedOn ?? new Date();

    const po = await tx.purchaseOrder.create({
      data: {
        poNo: await nextPoNo(tx),
        supplierId: supplier.id,
        // Terminal from birth: there is nothing left to receive.
        status: "RECEIVED",
        isBackfill: true,
        orderedAt: on,
        receivedAt: on,
        note: input.note?.trim() || null,
        lines: { createMany: { data: lines } },
      },
      include: { lines: true },
    });

    // ── Fill unknown costs only ──────────────────────────────────────────
    const totalUnits = lines.reduce((s, l) => s + l.quantity, 0);
    const totalValue = lines.reduce((s, l) => s + l.unitCost * l.quantity, 0);
    const weighted = totalUnits > 0 ? Math.round(totalValue / totalUnits) : 0;

    if (product.purchaseCost === 0 && weighted > 0) {
      await tx.product.update({
        where: { id: product.id },
        data: { purchaseCost: weighted },
      });
    }

    // Same fill-only rule per option, grouped by the cost being written so the
    // whole loop costs one statement per distinct cost instead of two per line.
    // `purchaseCost: 0` stays in the `where`: the guard against overwriting a
    // known cost is enforced by the database, not by the value read earlier.
    const fills = new Map<number, number[]>();
    for (const line of lines) {
      if (line.variantId == null || line.unitCost <= 0) continue;
      if (variantById.get(line.variantId)?.purchaseCost !== 0) continue;
      const ids = fills.get(line.unitCost);
      if (ids) ids.push(line.variantId);
      else fills.set(line.unitCost, [line.variantId]);
    }
    for (const [unitCost, ids] of fills) {
      await tx.productVariant.updateMany({
        where: { id: { in: ids }, purchaseCost: 0 },
        data: { purchaseCost: unitCost },
      });
    }

    return po;
    // A backfill is several round trips deep against a remote database, which
    // is exactly the shape that outruns Prisma's default five-second ceiling
    // and fails mid-write with "Transaction not found". Same ceiling the rest
    // of purchasing uses; nothing here holds a lock long enough for it to hurt.
  }, TX_OPTIONS);
}
