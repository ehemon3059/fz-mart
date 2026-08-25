import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/cache";

// ─────────────────────────────────────────────────────────────
// Profit by supplier
// ─────────────────────────────────────────────────────────────
//
// "Whose goods actually earn?" — a question the monthly P&L can't answer,
// because it totals the shop rather than splitting it by where stock came from.
//
// ATTRIBUTION, AND ITS LIMIT
// An OrderItem records what a product cost (purchaseCost, snapshotted at
// checkout) but not who supplied it — the link runs Product → PurchaseOrderLine
// → PurchaseOrder → Supplier. A product bought from two suppliers over time
// therefore has no single true owner, so this report attributes each product to
// the supplier of its MOST RECENT RECEIVED purchase order, and says so in the
// UI rather than presenting an approximation as fact.
//
// Products never received against a PO (everything predating purchasing, or
// stock entered by hand) have no supplier at all. They are reported as one
// explicit "Not linked to a supplier" row rather than being dropped, because a
// silent omission would make the totals disagree with the P&L for no visible
// reason.
//
// Revenue and cost follow the SAME rules as the monthly P&L (see report.ts), so
// the two agree: recognised on the DELIVERED date, and goods that were later
// returned contribute no COGS.

const TTL_SECONDS = 300;

export interface SupplierProfitRow {
  /** Null for products never received against a purchase order. */
  supplierId: number | null;
  supplierName: string;
  /** Merchandise value of what sold, paisa. Excludes shipping. */
  revenue: number;
  /** Cost of those goods, paisa — the snapshotted purchase cost. */
  cogs: number;
  /** revenue − cogs, paisa. */
  grossProfit: number;
  /** Percentage of revenue kept as gross profit; null when nothing sold. */
  marginPct: number | null;
  unitsSold: number;
  /** How many distinct products of theirs sold in the period. */
  productCount: number;
}

export interface SupplierProfitReport {
  rows: SupplierProfitRow[];
  totals: { revenue: number; cogs: number; grossProfit: number; unitsSold: number };
  /** True when at least one row couldn't be tied to a supplier. */
  hasUnattributed: boolean;
}

/**
 * Which supplier each product came from most recently.
 *
 * Built from received PO lines only: an order that was written or placed but
 * never delivered says nothing about where the goods on the shelf came from.
 */
async function primarySupplierByProduct(): Promise<Map<number, { id: number; name: string }>> {
  const lines = await prisma.purchaseOrderLine.findMany({
    where: { receivedQty: { gt: 0 } },
    select: {
      productId: true,
      purchaseOrder: {
        select: { receivedAt: true, orderedAt: true, id: true, supplier: { select: { id: true, name: true } } },
      },
    },
  });

  // Latest wins. receivedAt is the honest date; fall back to orderedAt, then to
  // the PO id, so a part-received order still ranks sensibly.
  const best = new Map<number, { rank: number; id: number; name: string }>();
  for (const line of lines) {
    const po = line.purchaseOrder;
    const rank = po.receivedAt?.getTime() ?? po.orderedAt?.getTime() ?? po.id;
    const current = best.get(line.productId);
    if (!current || rank > current.rank) {
      best.set(line.productId, { rank, id: po.supplier.id, name: po.supplier.name });
    }
  }

  return new Map([...best].map(([productId, s]) => [productId, { id: s.id, name: s.name }]));
}

/**
 * Gross profit per supplier over a date range.
 *
 * `start`/`end` bound the DELIVERED date, matching the monthly P&L.
 */
export async function getSupplierProfitReport(
  start: Date,
  end: Date,
): Promise<SupplierProfitReport> {
  const key = `report:supplier-profit:${start.toISOString().slice(0, 10)}:${end
    .toISOString()
    .slice(0, 10)}`;

  return getOrSetCache(key, TTL_SECONDS, async () => {
    // Orders delivered in the window, by the audit trail — the same source the
    // P&L uses, so the two reports can never disagree about what "sold" means.
    const deliveredLogs = await prisma.orderStatusLog.findMany({
      where: { toStatus: "DELIVERED", createdAt: { gte: start, lte: end } },
      select: { orderId: true },
      distinct: ["orderId"],
    });
    const orderIds = deliveredLogs.map((l) => l.orderId);

    if (orderIds.length === 0) {
      return {
        rows: [],
        totals: { revenue: 0, cogs: 0, grossProfit: 0, unitsSold: 0 },
        hasUnattributed: false,
      };
    }

    const [items, supplierOf] = await Promise.all([
      prisma.orderItem.findMany({
        // Goods that came back are excluded outright: the P&L gives them no
        // COGS, so counting their revenue here would invent margin.
        where: { orderId: { in: orderIds }, order: { status: "DELIVERED" } },
        select: { productId: true, quantity: true, unitPrice: true, purchaseCost: true },
      }),
      primarySupplierByProduct(),
    ]);

    // Accumulate per supplier, keyed by id — with null for the unattributed.
    const acc = new Map<
      number | null,
      { name: string; revenue: number; cogs: number; units: number; products: Set<number> }
    >();

    for (const item of items) {
      // A deleted product keeps its order line but loses the link that would
      // name a supplier; it lands in the unattributed row.
      const supplier = item.productId != null ? supplierOf.get(item.productId) : undefined;
      const key = supplier?.id ?? null;
      const name = supplier?.name ?? "Not linked to a supplier";

      let row = acc.get(key);
      if (!row) {
        row = { name, revenue: 0, cogs: 0, units: 0, products: new Set<number>() };
        acc.set(key, row);
      }

      row.revenue += item.unitPrice * item.quantity;
      row.cogs += item.purchaseCost * item.quantity;
      row.units += item.quantity;
      if (item.productId != null) row.products.add(item.productId);
    }

    const rows: SupplierProfitRow[] = [...acc].map(([supplierId, r]) => {
      const grossProfit = r.revenue - r.cogs;
      return {
        supplierId,
        supplierName: r.name,
        revenue: r.revenue,
        cogs: r.cogs,
        grossProfit,
        marginPct: r.revenue > 0 ? Math.round((grossProfit / r.revenue) * 100) : null,
        unitsSold: r.units,
        productCount: r.products.size,
      };
    });

    // Best earners first — the ordering the question is actually asked in.
    rows.sort((a, b) => b.grossProfit - a.grossProfit);

    const totals = rows.reduce(
      (t, r) => ({
        revenue: t.revenue + r.revenue,
        cogs: t.cogs + r.cogs,
        grossProfit: t.grossProfit + r.grossProfit,
        unitsSold: t.unitsSold + r.unitsSold,
      }),
      { revenue: 0, cogs: 0, grossProfit: 0, unitsSold: 0 },
    );

    return { rows, totals, hasUnattributed: rows.some((r) => r.supplierId === null) };
  });
}
