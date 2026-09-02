import type { Prisma, ProductStatus, PurchaseOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordMovement } from "@/server/inventory/ledger";
import { notifyBackInStock } from "@/server/products/stock-notify";

// Purchase orders (Phase E): what you have ordered from suppliers and what is
// still on its way.
//
// The one rule that matters here: RECEIVING GOES THROUGH THE LEDGER. A receipt
// calls recordMovement() exactly like a sale or an adjustment, so incoming
// stock is not a special case — it arrives, stock rises, and StockMovement says
// why. Nothing in this module writes `stock` directly.

export class PurchasingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurchasingError";
  }
}

/** Statuses whose outstanding lines count as INCOMING stock. */
const INCOMING_STATUSES: PurchaseOrderStatus[] = ["ORDERED"];

/**
 * Transaction budget for the write paths below.
 *
 * Prisma's defaults are maxWait 2s / timeout 5s, and every one of these
 * transactions does work that GROWS WITH THE NUMBER OF LINES on the order — a
 * receipt alone is several round trips per line. The database is remote, so a
 * five-line delivery can spend more than five seconds in round trips alone and
 * Prisma then closes the transaction underneath the loop; the next query fails
 * with "Transaction not found", having already applied part of the receipt's
 * work only to roll it back. Nothing here holds a lock long enough for a
 * generous ceiling to hurt, and the same ceiling is already used by checkout.
 */
export const TX_OPTIONS = { maxWait: 8000, timeout: 20000 } as const;

// ── Suppliers ───────────────────────────────────────────────────────────────

export interface SupplierInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  note?: string | null;
  leadTimeDays?: number | null;
  isActive?: boolean;
}

export async function listSuppliers(includeInactive = false) {
  return prisma.supplier.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { purchaseOrders: true } } },
  });
}

export async function getSupplier(id: number) {
  return prisma.supplier.findUnique({ where: { id } });
}

export async function saveSupplier(id: number | null, input: SupplierInput) {
  const data = {
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    address: input.address?.trim() || null,
    note: input.note?.trim() || null,
    leadTimeDays:
      input.leadTimeDays != null && input.leadTimeDays > 0 ? Math.floor(input.leadTimeDays) : null,
    isActive: input.isActive ?? true,
  };
  if (!data.name) throw new PurchasingError("Supplier name is required.");

  return id
    ? prisma.supplier.update({ where: { id }, data })
    : prisma.supplier.create({ data });
}

/**
 * Delete a supplier, but only while nothing references it. A supplier with
 * purchase orders is history — deactivate it instead, so the POs keep their
 * attribution.
 */
export async function deleteSupplier(id: number): Promise<void> {
  const count = await prisma.purchaseOrder.count({ where: { supplierId: id } });
  if (count > 0) {
    throw new PurchasingError(
      `This supplier has ${count} purchase order(s). Deactivate it instead of deleting, so those orders keep their supplier.`,
    );
  }
  await prisma.supplier.delete({ where: { id } });
}

// ── Purchase orders ─────────────────────────────────────────────────────────

export interface PurchaseOrderLineInput {
  productId: number;
  variantId?: number | null;
  quantity: number;
  /** Per-unit supplier price in paisa. */
  unitCost: number;
}

export interface PurchaseOrderInput {
  supplierId: number;
  expectedOn?: Date | null;
  shippingCost?: number;
  customsCost?: number;
  labourCost?: number;
  miscCost?: number;
  note?: string | null;
  lines: PurchaseOrderLineInput[];
}

/**
 * Next PO number. Sequential rather than random: a supplier reads this over the
 * phone, and "PO-0042" survives that better than a hash.
 */
export async function nextPoNo(tx: Prisma.TransactionClient): Promise<string> {
  const last = await tx.purchaseOrder.findFirst({
    orderBy: { id: "desc" },
    select: { id: true },
  });
  return `PO-${String((last?.id ?? 0) + 1).padStart(4, "0")}`;
}

/**
 * Validate the submitted lines and snapshot what they refer to.
 *
 * The snapshot is the point: productName/variantLabel are frozen here so a
 * later rename in the catalogue never rewrites paperwork already sent to a
 * supplier. Shared by create and update so both agree on what a valid line is.
 */
async function resolveLines(tx: Prisma.TransactionClient, input: PurchaseOrderLineInput[]) {
  return Promise.all(
    input.map(async (line) => {
      const product = await tx.product.findUnique({
        where: { id: line.productId },
        select: { id: true, name: true, _count: { select: { variants: true } } },
      });
      if (!product) throw new PurchasingError("A product on this order no longer exists.");

      let variantLabel: string | null = null;
      if (line.variantId != null) {
        const variant = await tx.productVariant.findUnique({
          where: { id: line.variantId },
          select: { productId: true, size: true, colorName: true },
        });
        if (!variant || variant.productId !== product.id) {
          throw new PurchasingError("A chosen option no longer belongs to its product.");
        }
        variantLabel = [variant.colorName, variant.size].filter(Boolean).join(" / ") || null;
      } else if (product._count.variants > 0) {
        // A product with options keeps its units ON those options —
        // `Product.stock` is vestigial for it, and every storefront path sums
        // availability from the variants instead (lib/product-stock.ts). So an
        // option-less line here would receive real, paid-for goods into a
        // column nothing can ever sell from. Refused at the door rather than
        // absorbed: there is no correct guess as to WHICH size was ordered.
        throw new PurchasingError(
          `Choose which option of ${product.name} is being ordered — it is sold by option, ` +
            `and stock received against no option can never be sold.`,
        );
      }

      if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
        throw new PurchasingError(`Quantity for ${product.name} must be a positive whole number.`);
      }
      if (!Number.isFinite(line.unitCost) || line.unitCost < 0) {
        throw new PurchasingError(`Unit cost for ${product.name} can't be negative.`);
      }

      return {
        productId: product.id,
        variantId: line.variantId ?? null,
        productName: product.name,
        variantLabel,
        quantity: line.quantity,
        unitCost: Math.round(line.unitCost),
      };
    }),
  );
}

export async function createPurchaseOrder(input: PurchaseOrderInput) {
  if (input.lines.length === 0) {
    throw new PurchasingError("Add at least one product to the order.");
  }

  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findUnique({ where: { id: input.supplierId } });
    if (!supplier) throw new PurchasingError("Supplier not found.");

    const lines = await resolveLines(tx, input.lines);

    return tx.purchaseOrder.create({
      data: {
        poNo: await nextPoNo(tx),
        supplierId: input.supplierId,
        status: "DRAFT",
        expectedOn: input.expectedOn ?? null,
        shippingCost: Math.max(0, Math.round(input.shippingCost ?? 0)),
        customsCost: Math.max(0, Math.round(input.customsCost ?? 0)),
        labourCost: Math.max(0, Math.round(input.labourCost ?? 0)),
        miscCost: Math.max(0, Math.round(input.miscCost ?? 0)),
        note: input.note?.trim() || null,
        lines: { createMany: { data: lines } },
      },
      include: { lines: true },
    });
  }, TX_OPTIONS);
}

/** Rows per page — the rest are a click away on Next. */
export const PURCHASE_ORDERS_PAGE_SIZE = 8;

export type PurchaseOrderRow = Prisma.PurchaseOrderGetPayload<{
  include: {
    supplier: { select: { name: true } };
    lines: { select: { quantity: true; receivedQty: true; unitCost: true } };
  };
}>;

export interface PurchaseOrderListResult {
  orders: PurchaseOrderRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/**
 * One page of purchase orders, newest activity first.
 *
 * Ordered by updatedAt rather than by status or expected date: this list is a
 * work queue, and the order you touched last is the one you are still thinking
 * about. Placing, receiving, editing or paying an order all bump updatedAt, so
 * the row you just worked on comes back to the top instead of sinking into the
 * middle of its status group. `id` breaks ties so the page boundary is stable
 * for rows written in the same instant — without it, two orders sharing a
 * timestamp could swap places between page 1 and page 2 and hide a row.
 */
export async function listPurchaseOrders(
  filter: { status?: PurchaseOrderStatus; page?: number; pageSize?: number } = {},
): Promise<PurchaseOrderListResult> {
  const pageSize = filter.pageSize ?? PURCHASE_ORDERS_PAGE_SIZE;
  const page = Math.max(1, filter.page ?? 1);
  const where: Prisma.PurchaseOrderWhereInput = filter.status ? { status: filter.status } : {};

  const [orders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      include: {
        supplier: { select: { name: true } },
        lines: { select: { quantity: true, receivedQty: true, unitCost: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return {
    orders,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * How many orders sit in each status, for the filter tabs.
 *
 * Counted in one grouped query rather than four, and every status is present in
 * the returned record even when it has no rows — a tab that reads "Cancelled 0"
 * tells the admin the filter works and there is nothing there, where a missing
 * number reads as a bug.
 */
export async function countPurchaseOrdersByStatus(): Promise<
  Record<PurchaseOrderStatus, number>
> {
  const groups = await prisma.purchaseOrder.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const counts: Record<PurchaseOrderStatus, number> = {
    DRAFT: 0,
    ORDERED: 0,
    RECEIVED: 0,
    CANCELLED: 0,
  };
  for (const g of groups) counts[g.status] = g._count._all;
  return counts;
}

export async function getPurchaseOrder(id: number) {
  return prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      lines: { orderBy: { id: "asc" } },
      payments: { orderBy: [{ paidOn: "desc" }, { id: "desc" }] },
    },
  });
}

/**
 * Move a draft to ORDERED — the point at which its lines start counting as
 * incoming stock. Only a DRAFT can be placed, so an already-live order can't be
 * "placed" a second time.
 */
export async function markOrdered(id: number): Promise<void> {
  const updated = await prisma.purchaseOrder.updateMany({
    where: { id, status: "DRAFT" },
    data: { status: "ORDERED", orderedAt: new Date() },
  });
  if (updated.count === 0) {
    throw new PurchasingError("Only a draft order can be placed.");
  }
}

/**
 * Cancel a purchase order. Allowed from DRAFT or ORDERED; its outstanding units
 * stop counting as incoming.
 *
 * Already-received units are NOT reversed — they are on the shelf, and the
 * PURCHASE movements that put them there are history. Cancelling a partly
 * received order simply stops the rest from arriving.
 */
export async function cancelPurchaseOrder(id: number): Promise<void> {
  const updated = await prisma.purchaseOrder.updateMany({
    where: { id, status: { in: ["DRAFT", "ORDERED"] } },
    data: { status: "CANCELLED" },
  });
  if (updated.count === 0) {
    throw new PurchasingError("This order can no longer be cancelled.");
  }
}

export interface ReceiptLineInput {
  lineId: number;
  /** How many units arrived in THIS delivery. Additive, not a running total. */
  quantity: number;
}

/**
 * Receive a delivery against a purchase order.
 *
 * Each line's units are added to stock through recordMovement(), so a PURCHASE
 * lands in the same ledger as every other stock change. Landed cost is computed
 * here: the supplier's unit price plus this line's share of the order's freight
 * and customs, apportioned BY VALUE.
 *
 * Partial deliveries are the normal case — receive what turned up, leave the
 * rest outstanding. The PO closes itself once every line is complete.
 */
export async function receivePurchaseOrder(
  id: number,
  receipts: ReceiptLineInput[],
  actorName: string,
  /**
   * Where the goods physically landed. Null when the shop keeps no locations —
   * recorded on the movement rather than guessed, so per-location reporting
   * never invents a shelf.
   */
  locationId: number | null = null,
): Promise<void> {
  if (receipts.length === 0) throw new PurchasingError("Nothing to receive.");

  const productIds = await prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!po) throw new PurchasingError("Purchase order not found.");
    if (po.status !== "ORDERED") {
      throw new PurchasingError("Only a placed order can be received.");
    }

    const byId = new Map(po.lines.map((l) => [l.id, l]));

    // Which of the products on THIS receipt are sold by option. Resolved in one
    // query up front rather than per line: this runs inside the transaction,
    // and on a remote database a round trip per line is latency the 5s
    // transaction budget can't spare. Only variant-less lines need the answer,
    // so a normal receipt asks nothing extra at all.
    const variantlessProductIds = [
      ...new Set(
        receipts
          .map((r) => byId.get(r.lineId))
          .filter((l) => l != null && l.variantId == null)
          .map((l) => l!.productId),
      ),
    ];
    const optionBacked = new Set<number>();
    if (variantlessProductIds.length > 0) {
      const rows = await tx.productVariant.findMany({
        where: { productId: { in: variantlessProductIds } },
        select: { productId: true },
        distinct: ["productId"],
      });
      for (const r of rows) optionBacked.add(r.productId);
    }

    // Total value of the ORDER, used to apportion the shipment costs. Based on
    // the full ordered quantity rather than this delivery, so two part-deliveries
    // of the same PO carry consistent per-unit overhead instead of the first one
    // absorbing everything.
    const orderValue = po.lines.reduce((sum, l) => sum + l.unitCost * l.quantity, 0);
    const overhead = shipmentOverhead(po);

    const touched: number[] = [];

    for (const receipt of receipts) {
      const line = byId.get(receipt.lineId);
      if (!line) throw new PurchasingError("A line on this receipt is not part of this order.");
      if (!Number.isInteger(receipt.quantity) || receipt.quantity <= 0) continue; // nothing to do

      const outstanding = line.quantity - line.receivedQty;
      if (receipt.quantity > outstanding) {
        throw new PurchasingError(
          `${line.productName}: only ${outstanding} unit(s) are still outstanding.`,
        );
      }

      // Last line of defence before the goods actually move. resolveLines
      // refuses to WRITE an option-less line for a product sold by option, but
      // that is not enough on its own: PurchaseOrderLine.variantId is SetNull,
      // so deleting a variant silently nulls it on orders already placed, and a
      // simple product may have gained options since the order was written.
      // Either way the credit below would land on the vestigial `Product.stock`
      // and the units would be unsellable, so the receipt stops here instead.
      if (line.variantId == null && optionBacked.has(line.productId)) {
        throw new PurchasingError(
          `${line.productName} is sold by option, but this line names none — receiving it ` +
            `would add stock that can never be sold. Edit the order and pick the option ` +
            `these units belong to.`,
        );
      }

      // Shared with the detail page's landed-cost table — see landedUnitCost.
      const landedCost = landedUnitCost(line, orderValue, overhead);

      await recordMovement(tx, {
        productId: line.productId,
        variantId: line.variantId,
        type: "PURCHASE",
        delta: receipt.quantity,
        unitCost: landedCost,
        reason: po.poNo,
        actorName,
        locationId,
      });

      await tx.purchaseOrderLine.update({
        where: { id: line.id },
        data: { receivedQty: { increment: receipt.quantity } },
      });

      // Keep the product's current sourcing cost in step with what the goods
      // most recently actually cost. This is what COGS snapshots from at
      // checkout, so leaving it stale would quietly distort future margins.
      if (line.variantId != null) {
        await tx.productVariant.update({
          where: { id: line.variantId },
          data: { purchaseCost: landedCost },
        });
      } else {
        await tx.product.update({
          where: { id: line.productId },
          data: { purchaseCost: landedCost },
        });
      }

      touched.push(line.productId);
    }

    // Close the PO once every line is complete. Derived from the lines rather
    // than asked of the user, so the status can't disagree with them.
    const fresh = await tx.purchaseOrderLine.findMany({
      where: { purchaseOrderId: id },
      select: { quantity: true, receivedQty: true },
    });
    if (fresh.every((l) => l.receivedQty >= l.quantity)) {
      await tx.purchaseOrder.update({
        where: { id },
        data: { status: "RECEIVED", receivedAt: new Date() },
      });
    }

    return [...new Set(touched)];
  }, TX_OPTIONS);

  // Restock alerts, outside the transaction — a notification failure must never
  // roll back goods that physically arrived.
  for (const productId of productIds) {
    notifyBackInStock(productId).catch((e) =>
      console.error("[purchasing] restock notify failed:", e),
    );
  }
}

export interface IncomingRow {
  productId: number;
  variantId: number | null;
  /** Units ordered but not yet received, across all live POs. */
  incoming: number;
  /** Soonest expected arrival among those POs, if any carries a date. */
  expectedOn: Date | null;
}

/**
 * Outstanding units per stock row, for the Available/Incoming column on the
 * stock overview. Keyed the same way the overview keys its rows.
 */
export async function getIncomingByRow(): Promise<Map<string, IncomingRow>> {
  const lines = await prisma.purchaseOrderLine.findMany({
    where: { purchaseOrder: { status: { in: INCOMING_STATUSES } } },
    select: {
      productId: true,
      variantId: true,
      quantity: true,
      receivedQty: true,
      purchaseOrder: { select: { expectedOn: true } },
    },
  });

  const map = new Map<string, IncomingRow>();
  for (const line of lines) {
    const outstanding = line.quantity - line.receivedQty;
    if (outstanding <= 0) continue;

    const key = line.variantId != null ? `v${line.variantId}` : `p${line.productId}`;
    const existing = map.get(key);
    const expected = line.purchaseOrder.expectedOn;

    if (existing) {
      existing.incoming += outstanding;
      // Soonest date wins — that is when cover actually returns.
      if (expected && (!existing.expectedOn || expected < existing.expectedOn)) {
        existing.expectedOn = expected;
      }
    } else {
      map.set(key, {
        productId: line.productId,
        variantId: line.variantId,
        incoming: outstanding,
        expectedOn: expected,
      });
    }
  }
  return map;
}

/**
 * Per-product supplier lead time, for the reorder-point calculation.
 *
 * A product bought from several suppliers takes the MOST RECENT one's lead
 * time — that is who you would most likely reorder from. `orderBy: id desc`
 * with `distinct` keeps the newest line per product (Prisma applies distinct
 * after ordering), so the ordering is load-bearing here, not cosmetic.
 */
export async function getLeadTimesByProduct(): Promise<Map<number, number>> {
  const lines = await prisma.purchaseOrderLine.findMany({
    where: { purchaseOrder: { supplier: { leadTimeDays: { not: null } } } },
    select: {
      productId: true,
      purchaseOrder: { select: { supplier: { select: { leadTimeDays: true } } } },
    },
    distinct: ["productId"],
    orderBy: { id: "desc" },
  });

  const map = new Map<number, number>();
  for (const line of lines) {
    const lead = line.purchaseOrder.supplier.leadTimeDays;
    if (lead != null) map.set(line.productId, lead);
  }
  return map;
}

/** A product on a PO that has received stock but can't be sold yet. */
/** What one option most recently cost to get onto the shelf. */
export interface VariantLandedCost {
  /** Paisa — supplier price plus this line's share of the shipment overheads. */
  landed: number;
  /** Paisa — what the supplier alone charged, before overheads. */
  unitCost: number;
  /** The order this came from, for pointing the admin at the paperwork. */
  poId: number;
  poNo: string;
  /**
   * TRUE while the goods have not arrived. The figure is then a projection:
   * receiving is what writes it to the ledger and onto `purchaseCost`, and an
   * edit to the order before then will move it. Shown differently for that
   * reason — a number that can still change must not look settled.
   */
  isEstimate: boolean;
}

/**
 * The landed cost of each option of a product, from the most recent order that
 * explains it.
 *
 * Read from the purchase orders rather than from `ProductVariant.purchaseCost`
 * because that column is only written when goods are RECEIVED. An order that
 * has been placed but not yet delivered already knows what its units will cost
 * — that is exactly the number an admin is pricing against — and reading the
 * column would show 0 for it.
 *
 * Newest order wins per option, matching "what did this last cost us". A
 * cancelled order answers nothing and is skipped.
 */
export async function getVariantLandedCosts(
  productId: number,
): Promise<Map<number, VariantLandedCost>> {
  // Orders carrying this product, newest first. Every line comes back, not just
  // this product's: the overhead is apportioned across the WHOLE order, so the
  // order's total value is needed to work out any one line's share.
  const orders = await prisma.purchaseOrder.findMany({
    where: { status: { not: "CANCELLED" }, lines: { some: { productId } } },
    select: {
      id: true,
      poNo: true,
      shippingCost: true,
      customsCost: true,
      labourCost: true,
      miscCost: true,
      lines: {
        select: {
          productId: true,
          variantId: true,
          quantity: true,
          unitCost: true,
          receivedQty: true,
        },
      },
    },
    orderBy: { id: "desc" },
  });

  const out = new Map<number, VariantLandedCost>();
  for (const po of orders) {
    const orderValue = po.lines.reduce((sum, l) => sum + l.unitCost * l.quantity, 0);
    const overhead = shipmentOverhead(po);
    for (const line of po.lines) {
      // Option-less lines have no row in the options editor to land on.
      if (line.productId !== productId || line.variantId == null) continue;
      // Newest order first, so the first answer per option is the current one.
      if (out.has(line.variantId)) continue;
      out.set(line.variantId, {
        landed: landedUnitCost(line, orderValue, overhead),
        unitCost: line.unitCost,
        poId: po.id,
        poNo: po.poNo,
        isEstimate: line.receivedQty === 0,
      });
    }
  }
  return out;
}

export interface UnsellableRow {
  productId: number;
  name: string;
  status: ProductStatus;
  receivedQty: number;
  /** What is stopping it going on sale, in the admin's words. */
  missing: string[];
}

/**
 * Products on this PO that have taken delivery but cannot be sold.
 *
 * Receiving goods and listing them are separate jobs, often done by different
 * people on different days, and the gap between them is where money quietly
 * sits in a warehouse. This is the list that closes it: everything that arrived
 * against this order and still needs a photo, a price, or publishing.
 *
 * Only lines with receivedQty > 0 are considered — nothing has arrived for the
 * rest, so there is nothing to sell yet and no omission to report.
 */
export async function getUnsellableReceived(purchaseOrderId: number): Promise<UnsellableRow[]> {
  const lines = await prisma.purchaseOrderLine.findMany({
    where: { purchaseOrderId, receivedQty: { gt: 0 } },
    select: {
      productId: true,
      receivedQty: true,
      product: {
        select: {
          id: true,
          name: true,
          status: true,
          price: true,
          images: { select: { id: true }, take: 1 },
          colors: { select: { imageUrl: true } },
          variants: { select: { imageUrl: true } },
        },
      },
    },
  });

  // One row per product: a PO may carry several options of the same product,
  // and "add a photo" is a job you do once for the product, not once per size.
  const byProduct = new Map<number, UnsellableRow>();

  for (const line of lines) {
    const p = line.product;

    const hasImage =
      p.images.length > 0 ||
      p.colors.some((c) => c.imageUrl?.trim()) ||
      p.variants.some((v) => v.imageUrl?.trim());

    const missing: string[] = [];
    if (!hasImage) missing.push("a photo");
    if (p.price <= 0) missing.push("a price");
    // Listed last: it is the final step, and saying "publish it" while a photo
    // is still missing would be advice the admin cannot act on yet.
    if (p.status !== "ACTIVE") missing.push("publishing");

    if (missing.length === 0) continue;

    const existing = byProduct.get(p.id);
    if (existing) {
      existing.receivedQty += line.receivedQty;
    } else {
      byProduct.set(p.id, {
        productId: p.id,
        name: p.name,
        status: p.status,
        receivedQty: line.receivedQty,
        missing,
      });
    }
  }

  return [...byProduct.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// ── Editing, deleting, and paying ───────────────────────────────────────────

/**
 * Rewrite a DRAFT purchase order.
 *
 * DRAFT only, and that restriction is what makes replacing the lines wholesale
 * safe: a draft has never been received, so no PurchaseOrderLine id is
 * referenced by a receipt or a stock movement. (Contrast ProductVariant, where
 * delete-and-recreate destroyed reservations and ledger links — the difference
 * is that nothing points at a draft's lines.)
 *
 * Once an order is placed it is a document the supplier also holds, so editing
 * stops there: cancel it and write a new one instead.
 */
export async function updatePurchaseOrder(id: number, input: PurchaseOrderInput) {
  if (input.lines.length === 0) {
    throw new PurchasingError("Add at least one product to the order.");
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.purchaseOrder.findUnique({
      where: { id },
      select: { status: true, payments: { select: { amount: true } } },
    });
    if (!existing) throw new PurchasingError("Purchase order not found.");
    if (existing.status !== "DRAFT") {
      throw new PurchasingError(
        "Only a draft can be edited. Cancel this order and write a new one instead.",
      );
    }

    const supplier = await tx.supplier.findUnique({ where: { id: input.supplierId } });
    if (!supplier) throw new PurchasingError("Supplier not found.");

    const lines = await resolveLines(tx, input.lines);

    // An edit must not shrink the order below what has already been handed
    // over. recordSupplierPayment refuses to take more than an order is worth,
    // but that guard only sees the total AT THE TIME OF PAYMENT — editing the
    // order afterwards walks straight past it, leaving a negative balance that
    // `dueTotal <= 0` then reports cheerfully as "Settled" while the supplier
    // is actually holding an overpayment nobody is tracking.
    //
    // Refused rather than absorbed, matching the payment path: the money is a
    // fact, the paperwork is what's wrong. Delete the payment, fix the order,
    // record it again.
    const alreadyPaid = existing.payments.reduce((sum, p) => sum + p.amount, 0);
    if (alreadyPaid > 0) {
      const newTotal = purchaseOrderTotal({
        lines,
        shippingCost: Math.max(0, Math.round(input.shippingCost ?? 0)),
        customsCost: Math.max(0, Math.round(input.customsCost ?? 0)),
        labourCost: Math.max(0, Math.round(input.labourCost ?? 0)),
        miscCost: Math.max(0, Math.round(input.miscCost ?? 0)),
      });
      if (newTotal < alreadyPaid) {
        const taka = (paisa: number) => (paisa / 100).toLocaleString("en-BD");
        throw new PurchasingError(
          `${taka(alreadyPaid)} ৳ has already been paid on this order, so it can't be edited ` +
            `down to ${taka(newTotal)} ৳. Remove the payment first, then edit.`,
        );
      }
    }

    await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: id } });

    return tx.purchaseOrder.update({
      where: { id },
      data: {
        supplierId: input.supplierId,
        expectedOn: input.expectedOn ?? null,
        shippingCost: Math.max(0, Math.round(input.shippingCost ?? 0)),
        customsCost: Math.max(0, Math.round(input.customsCost ?? 0)),
        labourCost: Math.max(0, Math.round(input.labourCost ?? 0)),
        miscCost: Math.max(0, Math.round(input.miscCost ?? 0)),
        note: input.note?.trim() || null,
        lines: { createMany: { data: lines } },
      },
      include: { lines: true },
    });
  }, TX_OPTIONS);
}

/**
 * Delete a purchase order outright.
 *
 * Only when nothing was ever received against it. A received order is the
 * explanation for stock that is physically on a shelf — its poNo is what the
 * PURCHASE movements name as their reason — so deleting one would leave the
 * ledger pointing at paperwork that no longer exists. Cancel those instead;
 * cancelling is reversible reading, deletion is not.
 *
 * Its payment history goes with it (cascade), which is correct precisely
 * because an order that received nothing and is being deleted was a mistake.
 */
export async function deletePurchaseOrder(id: number): Promise<void> {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: { status: true, poNo: true, lines: { select: { receivedQty: true } } },
  });
  if (!po) throw new PurchasingError("Purchase order not found.");

  const received = po.lines.reduce((sum, l) => sum + l.receivedQty, 0);
  if (received > 0) {
    throw new PurchasingError(
      `${po.poNo} has already received ${received} unit(s). It can be cancelled, but not deleted — ` +
        `the stock ledger refers to it for why those goods arrived.`,
    );
  }
  if (po.status === "ORDERED") {
    throw new PurchasingError(
      "This order has been placed with the supplier. Cancel it first, then delete it.",
    );
  }

  await prisma.purchaseOrder.delete({ where: { id } });
}

export interface PaymentInput {
  purchaseOrderId: number;
  /** Paisa. Must be positive. */
  amount: number;
  paidOn: Date;
  method?: string | null;
  note?: string | null;
  actorName: string;
}

/** What a purchase order costs in total: goods plus the overheads on top. */
export function purchaseOrderTotal(po: {
  lines: { quantity: number; unitCost: number }[];
  shippingCost: number;
  customsCost: number;
  labourCost: number;
  miscCost: number;
}): number {
  const goods = po.lines.reduce((sum, l) => sum + l.unitCost * l.quantity, 0);
  return goods + shipmentOverhead(po);
}

/**
 * One line's landed unit cost: what the supplier charged, plus that line's
 * share of the shipment overheads.
 *
 * Apportioned by VALUE, not by unit count — a ৳2,000 item carries more of the
 * freight than a ৳200 one, which is the convention that matches how shipping
 * is actually priced.
 *
 * Exported because two callers must agree to the paisa: `receivePurchaseOrder`
 * writes this into the ledger and onto the product's `purchaseCost`, and the
 * purchase-order detail page shows it before any of that has happened. A second
 * copy of the arithmetic would eventually drift and quote a number the ledger
 * then contradicts, so both read this one.
 *
 * `orderValue` is the value of the WHOLE order rather than one delivery, so two
 * part-deliveries of the same PO carry consistent per-unit overhead instead of
 * the first absorbing everything.
 */
export function landedUnitCost(
  line: { quantity: number; unitCost: number },
  orderValue: number,
  overhead: number,
): number {
  if (line.quantity <= 0) return line.unitCost;
  const share = orderValue > 0 ? (overhead * (line.unitCost * line.quantity)) / orderValue : 0;
  return Math.round(line.unitCost + share / line.quantity);
}

/**
 * The shipment-level costs on an order, added up.
 *
 * One place rather than four additions scattered about, because the set is
 * open: freight and customs were the first two, labour and miscellaneous the
 * next, and a fifth would otherwise mean hunting down every sum that has to
 * learn about it. Every one of them is optional — a domestic delivery pays
 * labour and nothing else — so this is usually a sum over mostly zeroes.
 */
export function shipmentOverhead(po: {
  shippingCost: number;
  customsCost: number;
  labourCost: number;
  miscCost: number;
}): number {
  return po.shippingCost + po.customsCost + po.labourCost + po.miscCost;
}

/**
 * Record money paid to a supplier against one order.
 *
 * Overpayment is refused rather than absorbed: paying more than an order is
 * worth is almost always a typo (a digit too many, or the same instalment
 * entered twice), and silently accepting it turns the outstanding figure — the
 * only number this feature exists to produce — into fiction.
 */
export async function recordSupplierPayment(input: PaymentInput) {
  const amount = Math.round(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new PurchasingError("Enter a payment amount greater than zero.");
  }

  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({
      where: { id: input.purchaseOrderId },
      select: {
        status: true,
        shippingCost: true,
        customsCost: true,
        labourCost: true,
        miscCost: true,
        lines: { select: { quantity: true, unitCost: true } },
        payments: { select: { amount: true } },
      },
    });
    if (!po) throw new PurchasingError("Purchase order not found.");
    if (po.status === "CANCELLED") {
      throw new PurchasingError("This order was cancelled. Payments can't be recorded against it.");
    }

    const total = purchaseOrderTotal(po);
    const paid = po.payments.reduce((sum, p) => sum + p.amount, 0);
    if (paid + amount > total) {
      const remaining = Math.max(0, total - paid);
      throw new PurchasingError(
        remaining === 0
          ? "This order is already fully paid."
          : `That is more than the ${(remaining / 100).toLocaleString("en-BD")} \u09f3 still outstanding.`,
      );
    }

    return tx.supplierPayment.create({
      data: {
        purchaseOrderId: input.purchaseOrderId,
        amount,
        paidOn: input.paidOn,
        method: input.method?.trim() || null,
        note: input.note?.trim() || null,
        actorName: input.actorName,
      },
    });
  });
}

/** Remove a recorded payment — for when one was entered by mistake. */
export async function deleteSupplierPayment(id: number): Promise<void> {
  await prisma.supplierPayment.delete({ where: { id } }).catch(() => {
    throw new PurchasingError("That payment record no longer exists.");
  });
}

export interface SupplierBalance {
  supplierId: number;
  name: string;
  /** Value of every live (non-cancelled) order placed with them, paisa. */
  ordered: number;
  paid: number;
  /** ordered − paid: what is still owed. */
  due: number;
}

/**
 * What is still owed to each supplier, across all their live orders.
 *
 * Cancelled orders are excluded — nothing is owed on an order that will never
 * arrive. Drafts ARE included: an order you have written but not yet placed is
 * money you are about to commit, and hiding it makes the figure optimistic.
 */
export async function getSupplierBalances(): Promise<SupplierBalance[]> {
  const suppliers = await prisma.supplier.findMany({
    select: {
      id: true,
      name: true,
      purchaseOrders: {
        where: { status: { not: "CANCELLED" } },
        select: {
          shippingCost: true,
          customsCost: true,
          labourCost: true,
          miscCost: true,
          lines: { select: { quantity: true, unitCost: true } },
          payments: { select: { amount: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return suppliers
    .map((s) => {
      let ordered = 0;
      let paid = 0;
      for (const po of s.purchaseOrders) {
        ordered += purchaseOrderTotal(po);
        paid += po.payments.reduce((sum, p) => sum + p.amount, 0);
      }
      return { supplierId: s.id, name: s.name, ordered, paid, due: ordered - paid };
    })
    .filter((s) => s.ordered > 0);
}
