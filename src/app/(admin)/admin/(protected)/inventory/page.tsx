import {
  getStockOverview,
  getWriteOffs,
  summarise,
  DEAD_STOCK_DAYS,
  VELOCITY_WINDOW_DAYS,
  DEFAULT_LEAD_TIME_DAYS,
  DEFAULT_SAFETY_DAYS,
} from "@/server/inventory/reports";
import { getInventoryConfig } from "@/server/settings/inventory";
import { formatTaka } from "@/lib/money";
import StockOverviewClient from "./StockOverviewClient";

export const metadata = { title: "Stock Overview — FZ-Mart Admin" };

export default async function InventoryOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;
  const [all, config, writeOffs] = await Promise.all([
    getStockOverview(),
    getInventoryConfig(),
    getWriteOffs(),
  ]);
  const totals = summarise(all);

  // The KPI cards double as filters.
  const filter = sp.filter;
  const rows =
    filter === "out"
      ? all.filter((r) => r.status === "OUT")
      : filter === "reorder"
        ? all.filter((r) => r.status === "REORDER")
        : filter === "dead"
          ? all.filter((r) => r.status === "DEAD")
          : all;

  // Money and dates are formatted here, server-side: the client component takes
  // plain strings so no Date crosses the boundary and the currency format stays
  // in one place.
  return (
    <StockOverviewClient
      rows={rows.map((r) => ({
        key: r.key,
        productId: r.productId,
        name: r.name,
        option: r.option,
        sku: r.sku,
        categoryPath: r.categoryPath,
        onHand: r.onHand,
        reserved: r.reserved,
        available: r.available,
        incoming: r.incoming,
        incomingOn: r.incomingOn
          ? r.incomingOn.toLocaleDateString("en-BD", { day: "2-digit", month: "short" })
          : null,
        unitCost: r.unitCost != null ? formatTaka(r.unitCost) : null,
        stockValue: r.stockValue != null ? formatTaka(r.stockValue) : null,
        reorderPoint: r.reorderPoint,
        lowStockThreshold: r.lowStockThreshold,
        dailyVelocity: r.dailyVelocity,
        status: r.status,
      }))}
      totalRowCount={all.length}
      totals={{
        outOfStock: totals.outOfStock,
        needsReorder: totals.needsReorder,
        deadRows: totals.deadRows,
        totalUnits: totals.totalUnits.toLocaleString("en-BD"),
        totalReserved: totals.totalReserved.toLocaleString("en-BD"),
        totalValue: formatTaka(totals.totalValue),
        deadValue: formatTaka(totals.deadValue),
        hasUnknownCost: totals.hasUnknownCost,
      }}
      filter={filter}
      digestEnabled={config.digestEnabled}
      writeOffs={{
        units: writeOffs.units,
        value: formatTaka(writeOffs.value),
        days: writeOffs.days,
      }}
      constants={{
        deadDays: DEAD_STOCK_DAYS,
        velocityWindow: VELOCITY_WINDOW_DAYS,
        leadDays: DEFAULT_LEAD_TIME_DAYS,
        safetyDays: DEFAULT_SAFETY_DAYS,
      }}
    />
  );
}
