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
  note?: string | null;
  lines: PurchaseOrderLineInput[];
}

/**
 * Next PO number. Sequential rather than random: a supplier reads this over the
 * phone, and "PO-0042" survives that better than a hash.
 */
async function nextPoNo(tx: Prisma.TransactionClient): Promise<string> {
  const last = await tx.purchaseOrder.findFirst({
    orderBy: { id: "desc" },
    select: { id: true },
  });
  return `PO-${String((last?.id ?? 0) + 1).padStart(4, "0")}`;
}

export async function createPurchaseOrder(input: PurchaseOrderInput) {
  if (input.lines.length === 0) {
    throw new PurchasingError("Add at least one product to the order.");
  }

  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findUnique({ where: { id: input.supplierId } });
    if (!supplier) throw new PurchasingError("Supplier not found.");

    // Snapshot product/variant names now, so a later rename doesn't rewrite the
    // paperwork already sent to the supplier.
    const lines = await Promise.all(
      input.lines.map(async (line) => {
        const product = await tx.product.findUnique({
          where: { id: line.productId },
          select: { id: true, name: true },
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

    return tx.purchaseOrder.create({
      data: {
        poNo: await nextPoNo(tx),
        supplierId: input.supplierId,
        status: "DRAFT",
        expectedOn: input.expectedOn ?? null,
        shippingCost: Math.max(0, Math.round(input.shippingCost ?? 0)),
        customsCost: Math.max(0, Math.round(input.customsCost ?? 0)),
        note: input.note?.trim() || null,
        lines: { createMany: { data: lines } },
      },
      include: { lines: true },
    });
  });
}

export async function listPurchaseOrders(status?: PurchaseOrderStatus) {
  return prisma.purchaseOrder.findMany({
    where: status ? { status } : {},
    orderBy: [{ status: "asc" }, { expectedOn: "asc" }, { id: "desc" }],
    include: {
      supplier: { select: { name: true } },
      lines: { select: { quantity: true, receivedQty: true, unitCost: true } },
    },
  });
}

export async function getPurchaseOrder(id: number) {
  return prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      lines: { orderBy: { id: "asc" } },
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

    // Total value of the ORDER, used to apportion freight/customs. Based on the
    // full ordered quantity rather than this delivery, so two part-deliveries of
    // the same PO carry consistent per-unit overhead instead of the first one
    // absorbing everything.
    const orderValue = po.lines.reduce((sum, l) => sum + l.unitCost * l.quantity, 0);
    const overhead = po.shippingCost + po.customsCost;

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

      // Landed cost = supplier price + this line's share of freight/customs.
      // Apportioned by value: a ৳2,000 item carries more of the freight than a
      // ৳200 one, which is the convention that matches how shipping is priced.
      const lineValue = line.unitCost * line.quantity;
      const share = orderValue > 0 ? (overhead * lineValue) / orderValue : 0;
      const landedUnitCost = Math.round(line.unitCost + (line.quantity > 0 ? share / line.quantity : 0));

      await recordMovement(tx, {
        productId: line.productId,
        variantId: line.variantId,
        type: "PURCHASE",
        delta: receipt.quantity,
        unitCost: landedUnitCost,
        reason: po.poNo,
        actorName,
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
          data: { purchaseCost: landedUnitCost },
        });
      } else {
        await tx.product.update({
          where: { id: line.productId },
          data: { purchaseCost: landedUnitCost },
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
  });

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
