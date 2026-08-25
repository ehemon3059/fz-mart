import { prisma } from "@/lib/prisma";
import type { StockMovementType } from "@prisma/client";
import { getIncomingByRow, getLeadTimesByProduct } from "@/server/purchasing";

// Read-only inventory reporting, all of it derived from the StockMovement
// ledger plus the cached stock levels. Nothing here writes.
//
// A note on what "a stock row" means throughout this module: a sized product
// keeps its units on its VARIANTS, and its own Product.stock column is
// vestigial. So every report below treats a variant as the unit of inventory
// when one exists, and the product itself only when it has none. Summing both
// would double-count.

/** How long without a sale before stock is considered dead. */
export const DEAD_STOCK_DAYS = 90;

/** Days of sales history used to compute an average daily velocity. */
export const VELOCITY_WINDOW_DAYS = 30;

/**
 * Supplier lead time, in days, assumed when computing a reorder point.
 * A per-supplier value belongs to Phase E (purchase orders); until then this
 * one number stands in for "how long a restock takes to arrive".
 */
export const DEFAULT_LEAD_TIME_DAYS = 7;

/** Extra days of cover held against a late delivery or a demand spike. */
export const DEFAULT_SAFETY_DAYS = 5;

export interface StockRow {
  /** Stable key for React and for addressing the row in an action. */
  key: string;
  productId: number;
  variantId: number | null;
  name: string;
  /** "Navy / M" for a variant row; null for a simple product. */
  option: string | null;
  sku: string | null;
  categoryPath: string;
  onHand: number;
  /** Units promised to orders that have neither shipped nor died. */
  reserved: number;
  /** onHand − reserved: what the storefront may actually sell. */
  available: number;
  /** Units ordered from suppliers but not yet received. */
  incoming: number;
  /** Soonest expected arrival of those units, if a PO carries a date. */
  incomingOn: Date | null;
  /** Per-unit landed cost in paisa; null when never set. */
  unitCost: number | null;
  /** onHand × unitCost, in paisa. Null when the cost is unknown. */
  stockValue: number | null;
  /** The admin-typed alert level. 0 = disabled. */
  lowStockThreshold: number;
  /** Units sold per day over the velocity window (0 when nothing sold). */
  dailyVelocity: number;
  /** (velocity × lead time) + safety stock, rounded up. */
  reorderPoint: number;
  /** Days since the last SALE movement; null if it has never sold. */
  daysSinceLastSale: number | null;
  status: "OUT" | "REORDER" | "DEAD" | "OK";
}

interface SoldAgg {
  qty: number;
  lastSoldAt: Date | null;
}

/**
 * Sales aggregated per stock row over the velocity window, plus the all-time
 * last sale date (needed for dead stock, which looks further back than the
 * velocity window does).
 */
async function getSalesAggregates(): Promise<Map<string, SoldAgg>> {
  const since = new Date(Date.now() - VELOCITY_WINDOW_DAYS * 86_400_000);

  const [windowed, lastSales] = await Promise.all([
    // Units sold inside the window. SALE deltas are negative, so the sum is
    // negated to get a positive quantity.
    prisma.stockMovement.groupBy({
      by: ["productId", "variantId"],
      where: { type: "SALE", createdAt: { gte: since } },
      _sum: { delta: true },
    }),
    // Most recent sale ever, for the dead-stock age.
    prisma.stockMovement.groupBy({
      by: ["productId", "variantId"],
      where: { type: "SALE" },
      _max: { createdAt: true },
    }),
  ]);

  const map = new Map<string, SoldAgg>();
  for (const r of windowed) {
    map.set(rowKey(r.productId, r.variantId), {
      qty: Math.abs(r._sum.delta ?? 0),
      lastSoldAt: null,
    });
  }
  for (const r of lastSales) {
    const key = rowKey(r.productId, r.variantId);
    const existing = map.get(key);
    if (existing) existing.lastSoldAt = r._max.createdAt;
    else map.set(key, { qty: 0, lastSoldAt: r._max.createdAt });
  }
  return map;
}

export function rowKey(productId: number, variantId: number | null): string {
  return variantId != null ? `v${variantId}` : `p${productId}`;
}

/**
 * Every sellable stock row with its levels, cost, velocity and reorder point.
 *
 * Inactive products are included: stock sitting in a warehouse is capital
 * whether or not it is currently listed, and hiding it is exactly how dead
 * stock goes unnoticed.
 */
export async function getStockOverview(): Promise<StockRow[]> {
  const [products, sales, categories, incoming, leadTimes] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        stock: true,
        reserved: true,
        purchaseCost: true,
        lowStockThreshold: true,
        baseSku: true,
        categoryId: true,
        variants: {
          select: {
            id: true,
            size: true,
            colorName: true,
            sku: true,
            stock: true,
            reserved: true,
            purchaseCost: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    getSalesAggregates(),
    prisma.category.findMany({ select: { id: true, name: true, parentId: true } }),
    getIncomingByRow(),
    getLeadTimesByProduct(),
  ]);

  // Category breadcrumb ("Fashion › Men's › Shirts") built from the flat tree.
  const catById = new Map(categories.map((c) => [c.id, c]));
  const pathOf = (id: number): string => {
    const parts: string[] = [];
    let node = catById.get(id);
    // Guard against a cycle in malformed data rather than looping forever.
    let hops = 0;
    while (node && hops++ < 12) {
      parts.unshift(node.name);
      node = node.parentId != null ? catById.get(node.parentId) : undefined;
    }
    return parts.join(" › ");
  };

  const now = Date.now();
  const rows: StockRow[] = [];

  for (const p of products) {
    const categoryPath = pathOf(p.categoryId);

    // Sized product: each variant is its own inventory row.
    if (p.variants.length > 0) {
      for (const v of p.variants) {
        // A variant's own cost wins; 0 means "inherit the product's" — the same
        // rule checkout applies when snapshotting COGS.
        const unitCost = v.purchaseCost || p.purchaseCost || null;
        rows.push(
          buildRow({
            productId: p.id,
            variantId: v.id,
            name: p.name,
            option: [v.colorName, v.size].filter(Boolean).join(" / ") || null,
            sku: v.sku,
            categoryPath,
            onHand: v.stock,
            reserved: v.reserved,
            unitCost,
            // Thresholds are product-level today; every variant inherits it.
            lowStockThreshold: p.lowStockThreshold,
            sales: sales.get(rowKey(p.id, v.id)),
            incoming: incoming.get(rowKey(p.id, v.id)),
            leadTimeDays: leadTimes.get(p.id),
            now,
          }),
        );
      }
      continue;
    }

    rows.push(
      buildRow({
        productId: p.id,
        variantId: null,
        name: p.name,
        option: null,
        sku: p.baseSku,
        categoryPath,
        onHand: p.stock,
        reserved: p.reserved,
        unitCost: p.purchaseCost || null,
        lowStockThreshold: p.lowStockThreshold,
        sales: sales.get(rowKey(p.id, null)),
        incoming: incoming.get(rowKey(p.id, null)),
        leadTimeDays: leadTimes.get(p.id),
        now,
      }),
    );
  }

  // Worst first: out of stock, then needs reordering, then everything else.
  const rank = { OUT: 0, REORDER: 1, DEAD: 2, OK: 3 } as const;
  return rows.sort((a, b) => rank[a.status] - rank[b.status] || a.name.localeCompare(b.name));
}

function buildRow(input: {
  productId: number;
  variantId: number | null;
  name: string;
  option: string | null;
  sku: string | null;
  categoryPath: string;
  onHand: number;
  reserved: number;
  unitCost: number | null;
  lowStockThreshold: number;
  sales: SoldAgg | undefined;
  incoming: { incoming: number; expectedOn: Date | null } | undefined;
  leadTimeDays: number | undefined;
  now: number;
}): StockRow {
  const { sales, onHand, reserved, unitCost, lowStockThreshold, incoming, leadTimeDays, now } =
    input;
  const available = Math.max(0, onHand - reserved);

  const soldInWindow = sales?.qty ?? 0;
  const dailyVelocity = soldInWindow / VELOCITY_WINDOW_DAYS;

  // (velocity × lead time) + safety stock. Uses THIS product's supplier lead
  // time when one is known, falling back to the global default — a supplier who
  // takes three weeks needs a far deeper reorder point than one who takes three
  // days, and averaging them serves neither.
  const leadTime = leadTimeDays ?? DEFAULT_LEAD_TIME_DAYS;
  const reorderPoint = Math.ceil(
    dailyVelocity * leadTime + dailyVelocity * DEFAULT_SAFETY_DAYS,
  );

  const daysSinceLastSale = sales?.lastSoldAt
    ? Math.floor((now - sales.lastSoldAt.getTime()) / 86_400_000)
    : null;

  // Dead = holding stock that hasn't moved in the window. Judged on ON HAND,
  // not available: units sitting in the warehouse are frozen capital whether or
  // not an open order has claimed them.
  const isDead =
    onHand > 0 && (daysSinceLastSale == null || daysSinceLastSale >= DEAD_STOCK_DAYS);

  // The manual threshold and the computed reorder point are BOTH honoured —
  // whichever is higher wins, so turning on the computed one can never make the
  // shop quieter about a product than the admin asked for.
  const trigger = Math.max(lowStockThreshold, reorderPoint);

  const incomingQty = incoming?.incoming ?? 0;

  // Reordering is driven by AVAILABLE, not on hand: units already promised to
  // orders can't satisfy the next shopper, so a shelf full of reserved goods
  // still needs restocking.
  //
  // Incoming stock suppresses the REORDER flag but NOT the OUT one. Goods on a
  // lorry can't be sold today, so an empty shelf is still empty — but nagging
  // someone to reorder something they have already ordered is how a warning
  // list becomes noise people stop reading.
  const status: StockRow["status"] =
    available <= 0
      ? "OUT"
      : trigger > 0 && available <= trigger && incomingQty <= 0
        ? "REORDER"
        : isDead
          ? "DEAD"
          : "OK";

  return {
    key: rowKey(input.productId, input.variantId),
    productId: input.productId,
    variantId: input.variantId,
    name: input.name,
    option: input.option,
    sku: input.sku,
    categoryPath: input.categoryPath,
    onHand,
    reserved,
    available,
    incoming: incomingQty,
    incomingOn: incoming?.expectedOn ?? null,
    unitCost,
    // Valued at ON HAND: reserved units are still yours until they ship.
    stockValue: unitCost != null ? onHand * unitCost : null,
    lowStockThreshold,
    dailyVelocity,
    reorderPoint,
    daysSinceLastSale,
    status,
  };
}

export interface OverviewTotals {
  rows: number;
  outOfStock: number;
  needsReorder: number;
  deadRows: number;
  totalUnits: number;
  /** Units promised to unshipped orders, across every row. */
  totalReserved: number;
  /** Total capital tied up in stock, paisa. Excludes rows with unknown cost. */
  totalValue: number;
  /** Capital frozen in dead stock, paisa. */
  deadValue: number;
  /** True when at least one row has no cost, so the totals understate reality. */
  hasUnknownCost: boolean;
}

export function summarise(rows: StockRow[]): OverviewTotals {
  let totalUnits = 0;
  let totalReserved = 0;
  let totalValue = 0;
  let deadValue = 0;
  let hasUnknownCost = false;

  for (const r of rows) {
    totalUnits += r.onHand;
    totalReserved += r.reserved;
    if (r.stockValue != null) {
      totalValue += r.stockValue;
      if (r.status === "DEAD") deadValue += r.stockValue;
    } else if (r.onHand > 0) {
      hasUnknownCost = true;
    }
  }

  return {
    rows: rows.length,
    outOfStock: rows.filter((r) => r.status === "OUT").length,
    needsReorder: rows.filter((r) => r.status === "REORDER").length,
    deadRows: rows.filter((r) => r.status === "DEAD").length,
    totalUnits,
    totalReserved,
    totalValue,
    deadValue,
    hasUnknownCost,
  };
}

export interface MovementFilter {
  productId?: number;
  type?: StockMovementType;
  from?: Date;
  to?: Date;
  /** Restrict to one location; "none" finds the rows that never recorded one. */
  locationId?: number | "none";
  page?: number;
  pageSize?: number;
}

export const MOVEMENTS_PAGE_SIZE = 50;

export interface MovementRow {
  id: number;
  createdAt: Date;
  type: StockMovementType;
  delta: number;
  beforeQty: number;
  afterQty: number;
  unitCost: number | null;
  reason: string | null;
  actorName: string;
  productId: number;
  productName: string;
  option: string | null;
  /** The moved variant's SKU, when it has one. */
  sku: string | null;
  orderId: number | null;
  orderNo: string | null;
  /** True for rows synthesised by the Phase A backfill, whose levels are unknown. */
  isBackfill: boolean;
  /** Where it happened; null for movements that never recorded a location. */
  locationName: string | null;
}

/** Paginated ledger view, newest first. */
export async function listMovements(filter: MovementFilter = {}): Promise<{
  rows: MovementRow[];
  total: number;
  page: number;
  pageCount: number;
}> {
  const pageSize = filter.pageSize ?? MOVEMENTS_PAGE_SIZE;
  const page = Math.max(1, filter.page ?? 1);

  const where: Record<string, unknown> = {};
  if (filter.productId) where.productId = filter.productId;
  if (filter.type) where.type = filter.type;
  if (filter.locationId != null) {
    where.locationId = filter.locationId === "none" ? null : filter.locationId;
  }
  if (filter.from || filter.to) {
    where.createdAt = {
      ...(filter.from ? { gte: filter.from } : {}),
      ...(filter.to ? { lte: filter.to } : {}),
    };
  }

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        createdAt: true,
        type: true,
        delta: true,
        beforeQty: true,
        afterQty: true,
        unitCost: true,
        reason: true,
        actorName: true,
        productId: true,
        product: { select: { name: true, baseSku: true } },
        variant: { select: { size: true, colorName: true, sku: true } },
        orderId: true,
        order: { select: { orderNo: true } },
        location: { select: { name: true } },
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return {
    rows: movements.map((m) => ({
      id: m.id,
      createdAt: m.createdAt,
      type: m.type,
      delta: m.delta,
      beforeQty: m.beforeQty,
      afterQty: m.afterQty,
      unitCost: m.unitCost,
      reason: m.reason,
      actorName: m.actorName,
      productId: m.productId,
      productName: m.product.name,
      option: m.variant
        ? [m.variant.colorName, m.variant.size].filter(Boolean).join(" / ") || null
        : null,
      // The variant's own SKU, falling back to the product's root — a movement
      // on a deleted variant keeps the product line readable.
      sku: m.variant?.sku ?? m.product.baseSku ?? null,
      orderId: m.orderId,
      orderNo: m.order?.orderNo ?? null,
      locationName: m.location?.name ?? null,
      // The backfill could not know historical levels and wrote 0/0 with an
      // accurate delta. Flagged so the UI shows "—" instead of a false "0 → 0".
      isBackfill: m.beforeQty === 0 && m.afterQty === 0 && m.reason === "Backfilled from order history",
    })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export interface WriteOffSummary {
  /** Units written off in the window. */
  units: number;
  /** What those units cost, in paisa. Excludes rows with no recorded cost. */
  value: number;
  days: number;
}

/**
 * Damaged stock written off over the last `days`.
 *
 * Values each write-off at the cost snapshotted on its movement, not today's
 * supplier price — the loss is what those particular units cost when they were
 * bought.
 */
export async function getWriteOffs(days = 30): Promise<WriteOffSummary> {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await prisma.stockMovement.findMany({
    where: { type: "DAMAGE", createdAt: { gte: since } },
    select: { delta: true, unitCost: true },
  });

  let units = 0;
  let value = 0;
  for (const r of rows) {
    const qty = Math.abs(r.delta);
    units += qty;
    if (r.unitCost != null) value += qty * r.unitCost;
  }
  return { units, value, days };
}

/** Products that have any ledger activity, for the movements filter dropdown. */
export async function listMovementProducts(): Promise<{ id: number; name: string }[]> {
  const ids = await prisma.stockMovement.groupBy({ by: ["productId"] });
  if (ids.length === 0) return [];
  return prisma.product.findMany({
    where: { id: { in: ids.map((r) => r.productId) } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/** RFC-4180 cell: quote when the value contains a comma, quote or newline. */
function csvCell(value: string): string {
  // Neutralise spreadsheet formulas before quoting. Excel and Calc treat a
  // cell opening with = + - @ (or a leading tab/CR, which they strip first) as
  // an expression, so a product NAMED "=HYPERLINK(...)" would execute on open.
  // Names here are admin-entered free text, so this is a real path rather than
  // a theoretical one. A leading apostrophe is the standard defusal: the
  // spreadsheet shows the literal text and never evaluates it.
  //
  // Safe to apply to every cell because numeric columns are written straight
  // to the row without passing through here — nothing that reaches this
  // function is a figure whose leading "-" needs to survive.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

/**
 * The stock overview as a spreadsheet.
 *
 * Money is written in TAKA with two decimals rather than paisa: this file is
 * opened by a person, and an unexplained ×100 is exactly the kind of thing that
 * turns a stock-take into an argument. Unknown costs are left blank, not zero —
 * "we don't know" and "it was free" are different facts, and a zero would
 * quietly understate the value of the shelf.
 */
export function buildStockCsv(rows: StockRow[]): string {
  const header = [
    "Product",
    "Option",
    "SKU",
    "Category",
    "On hand",
    "Reserved",
    "Available",
    "Incoming",
    "Expected on",
    "Unit cost (Tk)",
    "Stock value (Tk)",
    "Reorder point",
    "Low-stock alert",
    "Sold per day (30d)",
    "Days since last sale",
    "Status",
  ];

  const taka = (paisa: number | null) => (paisa == null ? "" : (paisa / 100).toFixed(2));

  const lines = [header.map(csvCell).join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.name),
        csvCell(r.option ?? ""),
        csvCell(r.sku ?? ""),
        csvCell(r.categoryPath),
        String(r.onHand),
        String(r.reserved),
        String(r.available),
        String(r.incoming),
        csvCell(r.incomingOn ? r.incomingOn.toISOString().slice(0, 10) : ""),
        taka(r.unitCost),
        taka(r.stockValue),
        String(r.reorderPoint),
        String(r.lowStockThreshold),
        r.dailyVelocity.toFixed(2),
        r.daysSinceLastSale == null ? "" : String(r.daysSinceLastSale),
        csvCell(r.status),
      ].join(","),
    );
  }

  // UTF-8 BOM so Excel opens Bangla product names correctly.
  return "\ufeff" + lines.join("\r\n");
}
