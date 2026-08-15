import Link from "next/link";
import {
  getStockOverview,
  getWriteOffs,
  summarise,
  DEAD_STOCK_DAYS,
  VELOCITY_WINDOW_DAYS,
  DEFAULT_LEAD_TIME_DAYS,
  DEFAULT_SAFETY_DAYS,
  type StockRow,
} from "@/server/inventory/reports";
import { getInventoryConfig } from "@/server/settings/inventory";
import { formatTaka } from "@/lib/money";
import { Badge, type BadgeTone } from "@/components/admin/ui/Badge";
import { KpiCard } from "@/components/admin/ui/Card";
import { DataTable, Th, Td, Tr, TableEmpty } from "@/components/admin/ui/DataTable";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import DigestToggle from "./DigestToggle";

export const metadata = { title: "Stock Overview — FZ-Mart Admin" };

const STATUS: Record<StockRow["status"], { label: string; tone: BadgeTone }> = {
  OUT: { label: "Out of stock", tone: "danger" },
  REORDER: { label: "Reorder", tone: "warning" },
  DEAD: { label: `No sale ${DEAD_STOCK_DAYS}d`, tone: "neutral" },
  OK: { label: "OK", tone: "success" },
};

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

  // The KPI cards double as filters — clicking one narrows the table below.
  const filter = sp.filter;
  const rows =
    filter === "out"
      ? all.filter((r) => r.status === "OUT")
      : filter === "reorder"
        ? all.filter((r) => r.status === "REORDER")
        : filter === "dead"
          ? all.filter((r) => r.status === "DEAD")
          : all;

  const cards = [
    {
      key: "out",
      label: "Out of Stock",
      value: String(totals.outOfStock),
      sub: "Nothing left to sell",
      tone: "warning" as const,
      icon: "ban" as const,
    },
    {
      key: "reorder",
      label: "Needs Reorder",
      value: String(totals.needsReorder),
      sub: "At or below reorder point",
      tone: "warning" as const,
      icon: "warn" as const,
    },
    {
      key: "dead",
      label: "Dead Stock",
      value: formatTaka(totals.deadValue),
      sub: `${totals.deadRows} row(s), no sale in ${DEAD_STOCK_DAYS}d`,
      tone: "neutral" as const,
      icon: "box" as const,
    },
    {
      key: "value",
      label: "Stock Value",
      value: formatTaka(totals.totalValue),
      sub: `${totals.totalUnits.toLocaleString("en-BD")} on hand · ${totals.totalReserved.toLocaleString("en-BD")} reserved`,
      tone: "accent" as const,
      icon: "tag" as const,
    },
  ];

  return (
    <div className="space-y-8 px-4 py-8 sm:px-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
            Stock Overview
          </h1>
          <p className="mt-1 text-[13.5px] text-stone-500">
            What you hold, what it cost, and what needs reordering. Sized products are listed
            per option — that is where their units actually live.
          </p>
        </div>
        <DigestToggle enabled={config.digestEnabled} />
      </div>

      {/* KPI row — each card filters the table below. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <KpiCard
            key={c.key}
            label={c.label}
            value={c.value}
            sub={c.sub}
            icon={c.icon}
            tone={c.tone}
            href={c.key === "value" ? undefined : `/admin/inventory?filter=${c.key}`}
          />
        ))}
      </div>

      {writeOffs.units > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-card">
          <div className="text-[13px]">
            <span className="font-semibold text-stone-800">
              {writeOffs.units} unit{writeOffs.units === 1 ? "" : "s"} written off
            </span>
            <span className="text-stone-500">
              {" "}in the last {writeOffs.days} days · {formatTaka(writeOffs.value)} at cost
            </span>
          </div>
          <Link
            href="/admin/inventory/movements?type=DAMAGE"
            className="text-[13px] text-accent underline-offset-2 hover:underline"
          >
            View write-offs
          </Link>
        </div>
      )}

      {totals.hasUnknownCost && (
        <p className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-2.5 text-[13px] text-warning-fg">
          Some products in stock have no sourcing cost set, so the values above understate what
          you actually hold. Set a purchase cost on those products to fix the totals.
        </p>
      )}

      {filter && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-500">
            Showing {rows.length} of {all.length} rows
          </span>
          <Link
            href="/admin/inventory"
            className="text-sm text-accent underline-offset-2 hover:underline"
          >
            Clear filter
          </Link>
        </div>
      )}

      {all.length === 0 ? (
        <EmptyState
          icon="box"
          title="No products yet"
          description="Stock levels appear here once you add products."
          action={{ label: "Add a product", href: "/admin/products/new", icon: "plus" }}
        />
      ) : (
        <DataTable
          head={
            <tr>
              <Th>Product</Th>
              <Th align="right">On Hand</Th>
              <Th align="right">Reserved</Th>
              <Th align="right" className="bg-stone-100">
                Available
              </Th>
              <Th align="right">Incoming</Th>
              <Th align="right">Reorder At</Th>
              <Th align="right">Sold/day</Th>
              <Th align="right">Value</Th>
              <Th>Status</Th>
            </tr>
          }
        >
          {rows.map((r) => (
            <Tr key={r.key}>
              <Td>
                <Link
                  href={`/admin/products/${r.productId}/edit`}
                  className="font-medium text-stone-900 hover:text-accent hover:underline"
                >
                  {r.name}
                </Link>
                {r.option && <span className="text-stone-500"> — {r.option}</span>}
                <div className="text-[11px] text-stone-400">
                  {r.sku ? <span className="font-spline-mono">{r.sku}</span> : r.categoryPath}
                </div>
              </Td>
              <Td numeric className="text-stone-600">
                {r.onHand}
              </Td>
              <Td numeric className={r.reserved > 0 ? "text-stone-600" : "text-stone-300"}>
                {r.reserved > 0 ? r.reserved : "—"}
              </Td>
              {/* Available is the number that matters — shaded so the eye lands
                  on it rather than on the raw on-hand count beside it. */}
              <Td
                numeric
                className={`bg-stone-50 font-bold ${
                  r.available <= 0 ? "text-danger-fg" : "text-stone-900"
                }`}
              >
                {r.available}
              </Td>
              <Td numeric className={r.incoming > 0 ? "text-success-fg" : "text-stone-300"}>
                {r.incoming > 0 ? (
                  <span title={r.incomingOn ? `Expected ${r.incomingOn.toLocaleDateString("en-BD")}` : undefined}>
                    +{r.incoming}
                    {r.incomingOn && (
                      <span className="block text-[10px] font-normal text-stone-400">
                        {r.incomingOn.toLocaleDateString("en-BD", { day: "2-digit", month: "short" })}
                      </span>
                    )}
                  </span>
                ) : (
                  "—"
                )}
              </Td>
              <Td numeric className="text-stone-500">
                {r.reorderPoint > 0 ? r.reorderPoint : r.lowStockThreshold > 0 ? r.lowStockThreshold : "—"}
              </Td>
              <Td numeric className="text-stone-500">
                {r.dailyVelocity > 0 ? r.dailyVelocity.toFixed(2) : "—"}
              </Td>
              <Td numeric className="font-medium text-stone-900">
                {r.stockValue != null ? formatTaka(r.stockValue) : "—"}
              </Td>
              <Td>
                <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
              </Td>
            </Tr>
          ))}
          {rows.length === 0 && (
            <TableEmpty colSpan={9}>Nothing matches this filter.</TableEmpty>
          )}
        </DataTable>
      )}

      {/* How the computed numbers are derived — shown rather than hidden, since
          a reorder point nobody can explain is a reorder point nobody trusts. */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
          <h3 className="text-[13px] font-semibold text-stone-900">Available</h3>
          <p className="mt-2 rounded-md bg-stone-50 px-3 py-2 font-spline-mono text-[12px] text-stone-600">
            available = on hand − reserved
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-stone-500">
            Reserved units are still in your warehouse but already promised to orders that
            haven&rsquo;t shipped. The storefront sells against Available — showing On Hand would
            oversell.
          </p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
          <h3 className="text-[13px] font-semibold text-stone-900">Reorder point</h3>
          <p className="mt-2 rounded-md bg-stone-50 px-3 py-2 font-spline-mono text-[12px] text-stone-600">
            (sold/day × {DEFAULT_LEAD_TIME_DAYS}d lead) + {DEFAULT_SAFETY_DAYS}d safety
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-stone-500">
            Computed from the last {VELOCITY_WINDOW_DAYS} days of sales. Your own per-product
            threshold still applies — whichever is higher wins, so this can never make the shop
            quieter than you asked.
          </p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
          <h3 className="text-[13px] font-semibold text-stone-900">Stock value</h3>
          <p className="mt-2 rounded-md bg-stone-50 px-3 py-2 font-spline-mono text-[12px] text-stone-600">
            on hand × landed cost
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-stone-500">
            Landed cost means what the unit really cost you — supplier price plus shipping and
            any customs — not just the invoice figure. Set it per product.
          </p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
          <h3 className="text-[13px] font-semibold text-stone-900">Dead stock</h3>
          <p className="mt-2 rounded-md bg-stone-50 px-3 py-2 font-spline-mono text-[12px] text-stone-600">
            in stock, no sale in {DEAD_STOCK_DAYS} days
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-stone-500">
            Capital sitting still. Inactive products are counted too — money is tied up whether
            or not the product is listed.
          </p>
        </div>
      </div>
    </div>
  );
}
