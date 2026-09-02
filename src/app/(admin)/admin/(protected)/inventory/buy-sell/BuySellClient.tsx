"use client";

/**
 * Buy & Sell Equal — every product with its selling side and its buying side on
 * one line.
 *
 * The column that matters is Purchase Status. A product can reach the storefront
 * without anyone ever recording where it came from, and until now nothing said
 * so: it simply sold, and the question "who did we buy this from, how many, at
 * what price" had no answer anywhere in the system. This screen makes that
 * absence visible and gives it a one-click fix, so the gap is a short queue to
 * work through rather than a permanent hole in the records.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProductStatus } from "@prisma/client";
import { formatTaka } from "@/lib/money";
import { DataTable, Th, Td, Tr, TableEmpty } from "@/components/admin/ui/DataTable";
import { Badge } from "@/components/admin/ui/Badge";
import { Button } from "@/components/admin/ui/Button";
import { Icon } from "@/components/icons";
import AddPurchasePanel from "./AddPurchasePanel";

export interface BuySellRow {
  productId: number;
  name: string;
  status: ProductStatus;
  price: number;
  wasPrice: number | null;
  stock: number;
  variantCount: number;
  sourced: boolean;
  unitsPurchased: number;
  lastPurchase: {
    poId: number;
    poNo: string;
    supplierName: string;
    /** Pre-formatted on the server. */
    on: string;
    isBackfill: boolean;
  } | null;
  /** Pre-formatted on the server. When this row last changed — it is what the
   *  list is ordered by, so it is shown rather than left to be guessed at. */
  lastUpdated: string;
}

export interface SupplierOption {
  id: number;
  name: string;
}

type Filter = "all" | "unsourced" | "sourced";

/** Rows per page — the rest are a click away on Next. */
const PAGE_SIZE = 8;

const TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "All products" },
  { key: "unsourced", label: "Not purchased" },
  { key: "sourced", label: "Purchased" },
];

export default function BuySellClient({
  rows,
  suppliers,
}: {
  rows: BuySellRow[];
  suppliers: SupplierOption[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<BuySellRow | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: rows.length,
      sourced: rows.filter((r) => r.sourced).length,
      unsourced: rows.filter((r) => !r.sourced).length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "sourced" && !r.sourced) return false;
      if (filter === "unsourced" && r.sourced) return false;
      if (q && !r.name.toLowerCase().includes(q)) {
        // Searching the supplier too, because "what did we get from Karim
        // Traders" is the other way an owner arrives at this screen.
        if (!r.lastPurchase?.supplierName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, filter, query]);

  // Clamped rather than reset: narrowing a search while on page 6 should land
  // on the last page that still has rows, never on an empty table.
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PAGE_SIZE;
  const pageRows = visible.slice(start, start + PAGE_SIZE);

  function onRecorded(message: string) {
    setTarget(null);
    setFlash(message);
    // Back to page 1: the product just recorded is now the most recent row, so
    // that is where the refresh puts it, and staying on page 4 would hide it.
    setPage(1);
    router.refresh();
  }

  return (
    <div className="space-y-6 px-4 py-8 sm:px-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
            Buy &amp; Sell Equal
          </h1>
          <p className="mt-1 text-[13.5px] text-stone-500">
            What each product sells for, beside what was actually bought for it. A product marked{" "}
            <span className="font-medium text-danger-fg">Not Purchased</span> is live on the
            storefront with no supplier, quantity or cost behind it — record the purchase and its
            margin becomes real.
          </p>
        </div>
        <Link
          href="/admin/inventory/purchase-orders/new"
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
        >
          New order
        </Link>
      </div>

      {flash && (
        <div className="flex items-start gap-2 rounded-lg border border-success bg-success-soft px-4 py-3 text-sm text-success-fg">
          <Icon name="check" size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{flash}</span>
          <button
            type="button"
            onClick={() => setFlash(null)}
            className="shrink-0 opacity-60 hover:opacity-100"
            aria-label="Dismiss"
          >
            <Icon name="x" size={15} />
          </button>
        </div>
      )}

      {/* The three numbers that say how big the gap is. */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Products" value={counts.all} tone="neutral" />
        <SummaryCard label="Purchase recorded" value={counts.sourced} tone="success" />
        <SummaryCard
          label="No purchase recorded"
          value={counts.unsourced}
          tone={counts.unsourced > 0 ? "danger" : "success"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-stone-300 bg-white p-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setFilter(t.key);
                setPage(1);
              }}
              className={
                "rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors " +
                (filter === t.key
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-100")
              }
            >
              {t.label}
              <span className={filter === t.key ? "ml-1.5 opacity-70" : "ml-1.5 text-stone-400"}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[14rem] flex-1 sm:max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
            <Icon name="search" size={15} />
          </span>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search product or supplier"
            className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      <DataTable
        head={
          <tr>
            <Th>Product</Th>
            <Th align="right">Selling Price</Th>
            <Th align="right">Stock</Th>
            <Th>Purchase Status</Th>
            <Th align="right">Action</Th>
          </tr>
        }
      >
        {pageRows.map((r) => (
          <Tr key={r.productId}>
            <Td>
              <Link
                href={`/admin/products/${r.productId}/edit`}
                className="font-medium text-stone-900 hover:text-accent hover:underline"
              >
                {r.name}
              </Link>
              {r.status !== "ACTIVE" && (
                <Badge tone="neutral" className="ml-2 align-middle">
                  {r.status === "DRAFT" ? "Draft" : "Hidden"}
                </Badge>
              )}
              {/* The supply-side answer, once there is one. */}
              <div className="mt-0.5 text-[12px] text-stone-500">
                {r.lastPurchase ? (
                  <>
                    From <span className="text-stone-700">{r.lastPurchase.supplierName}</span> ·{" "}
                    {r.unitsPurchased} bought · {r.lastPurchase.on}
                    {r.lastPurchase.isBackfill && (
                      <span className="ml-1 text-stone-400" title="Entered from memory afterwards">
                        (recorded later)
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-stone-400">No supplier recorded</span>
                )}
                <span className="text-stone-400"> · Updated {r.lastUpdated}</span>
              </div>
            </Td>

            <Td numeric>
              <span className="font-medium text-stone-900">{formatTaka(r.price)}</span>
              {r.wasPrice != null && (
                <span className="ml-1.5 text-[12px] text-stone-400 line-through">
                  {formatTaka(r.wasPrice)}
                </span>
              )}
            </Td>

            <Td numeric className="text-stone-700">
              {r.stock}
              {r.variantCount > 0 && (
                <span className="ml-1 text-[12px] text-stone-400">
                  · {r.variantCount} {r.variantCount === 1 ? "option" : "options"}
                </span>
              )}
            </Td>

            <Td>
              {r.sourced ? (
                <Badge tone="success">✅ Purchased</Badge>
              ) : (
                <Badge tone="danger">❌ Not Purchased</Badge>
              )}
            </Td>

            <Td numeric>
              {r.sourced && r.lastPurchase ? (
                <Link
                  href={`/admin/inventory/purchase-orders/${r.lastPurchase.poId}`}
                  className="font-semibold text-accent hover:underline"
                >
                  View
                </Link>
              ) : (
                <Button size="sm" icon="plus" onClick={() => setTarget(r)}>
                  Add Purchase
                </Button>
              )}
            </Td>
          </Tr>
        ))}

        {visible.length === 0 && (
          <TableEmpty colSpan={5}>
            {rows.length === 0
              ? "No products yet."
              : filter === "unsourced"
                ? "Every product has a purchase behind it. Nothing to fix."
                : "No product matches this filter."}
          </TableEmpty>
        )}
      </DataTable>

      {/* Hidden entirely while everything fits on one page — a lone "Page 1 of
          1" is noise on a shop with twenty products. */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between text-[13px]">
          <button
            type="button"
            onClick={() => setPage(current - 1)}
            disabled={current <= 1}
            className="rounded-lg border border-stone-200 px-3 py-1.5 font-medium text-stone-600 hover:border-stone-400 disabled:opacity-40 disabled:hover:border-stone-200"
          >
            ← Previous
          </button>
          <span className="text-stone-500">
            Showing{" "}
            <span className="font-medium text-stone-700">
              {start + 1}–{start + pageRows.length}
            </span>{" "}
            of {visible.length} · Page {current} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage(current + 1)}
            disabled={current >= pageCount}
            className="rounded-lg border border-stone-200 px-3 py-1.5 font-medium text-stone-600 hover:border-stone-400 disabled:opacity-40 disabled:hover:border-stone-200"
          >
            Next →
          </button>
        </div>
      )}

      {target && (
        <AddPurchasePanel
          productId={target.productId}
          productName={target.name}
          suppliers={suppliers}
          onCancel={() => setTarget(null)}
          onRecorded={onRecorded}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "success" | "danger";
}) {
  const accent =
    tone === "danger"
      ? "text-danger-fg"
      : tone === "success"
        ? "text-success-fg"
        : "text-stone-900";
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-card">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`mt-0.5 text-[22px] font-extrabold nums ${accent}`}>{value}</p>
    </div>
  );
}
