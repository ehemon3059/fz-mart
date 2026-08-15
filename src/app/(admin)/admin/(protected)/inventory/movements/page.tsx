import Link from "next/link";
import type { StockMovementType } from "@prisma/client";
import { listMovements, listMovementProducts } from "@/server/inventory/reports";
import { formatTaka } from "@/lib/money";
import { DataTable, Th, Td, Tr, TableEmpty } from "@/components/admin/ui/DataTable";
import { EmptyState } from "@/components/admin/ui/EmptyState";

export const metadata = { title: "Stock Movements — FZ-Mart Admin" };

/** Ledger types in the admin's words, with the colour each delta reads as. */
const TYPES: Record<StockMovementType, { label: string; cls: string }> = {
  SALE: { label: "Sale", cls: "bg-stone-100 text-stone-600" },
  CANCEL_RESTOCK: { label: "Order cancelled", cls: "bg-accent-soft text-accent-hover" },
  RETURN: { label: "Returned", cls: "bg-warning-soft text-warning-fg" },
  DAMAGE: { label: "Damaged", cls: "bg-danger-soft text-danger-fg" },
  PURCHASE: { label: "Received", cls: "bg-success-soft text-success-fg" },
  ADJUSTMENT: { label: "Correction", cls: "bg-stone-100 text-stone-600" },
};

const ALL_TYPES = Object.keys(TYPES) as StockMovementType[];

function startOfDay(v: string): Date | undefined {
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
function endOfDay(v: string): Date | undefined {
  const d = new Date(`${v}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function StockMovementsPage({
  searchParams,
}: {
  searchParams: Promise<{
    product?: string;
    type?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const productId = sp.product ? Number(sp.product) : undefined;
  const type = ALL_TYPES.includes(sp.type as StockMovementType)
    ? (sp.type as StockMovementType)
    : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const [result, products] = await Promise.all([
    listMovements({
      productId: Number.isFinite(productId) ? productId : undefined,
      type,
      from: sp.from ? startOfDay(sp.from) : undefined,
      to: sp.to ? endOfDay(sp.to) : undefined,
      page,
    }),
    listMovementProducts(),
  ]);

  /** Preserve the active filters when moving between pages. */
  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    if (sp.product) params.set("product", sp.product);
    if (sp.type) params.set("type", sp.type);
    if (sp.from) params.set("from", sp.from);
    if (sp.to) params.set("to", sp.to);
    if (n > 1) params.set("page", String(n));
    const qs = params.toString();
    return qs ? `/admin/inventory/movements?${qs}` : "/admin/inventory/movements";
  };

  const hasFilters = Boolean(sp.product || sp.type || sp.from || sp.to);

  return (
    <div className="space-y-6 px-4 py-8 sm:px-7">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
          Stock Movements
        </h1>
        <p className="mt-1 text-[13.5px] text-stone-500">
          Every change to every stock level, newest first. Append-only — nothing here is ever
          edited or deleted, so a number that moved can always be explained.
        </p>
      </div>

      {/* Filters — a plain GET form, so every view is a shareable URL. */}
      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-card">
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-stone-600">Product</label>
          <select
            name="product"
            defaultValue={sp.product ?? ""}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          >
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-stone-600">Type</label>
          <select
            name="type"
            defaultValue={sp.type ?? ""}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          >
            <option value="">All types</option>
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPES[t].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-stone-600">From</label>
          <input
            type="date"
            name="from"
            defaultValue={sp.from ?? ""}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-stone-600">To</label>
          <input
            type="date"
            name="to"
            defaultValue={sp.to ?? ""}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Filter
        </button>
        {hasFilters && (
          <Link
            href="/admin/inventory/movements"
            className="px-1 py-2 text-sm text-stone-500 underline-offset-2 hover:text-accent hover:underline"
          >
            Clear
          </Link>
        )}
      </form>

      {result.total === 0 ? (
        <EmptyState
          icon="file"
          title={hasFilters ? "No movements match those filters" : "No stock movements yet"}
          description={
            hasFilters
              ? "Try widening the date range or clearing the filters."
              : "Movements are recorded automatically as orders are placed, cancelled and returned."
          }
        />
      ) : (
        <>
          <DataTable
            head={
              <tr>
                <Th>When</Th>
                <Th>Product</Th>
                <Th>Type</Th>
                <Th align="right">Change</Th>
                <Th align="right">Before</Th>
                <Th align="right">After</Th>
                <Th>Reference</Th>
                <Th align="right">Unit Cost</Th>
                <Th>By</Th>
              </tr>
            }
          >
            {result.rows.map((m) => (
              <Tr key={m.id}>
                <Td className="whitespace-nowrap text-stone-500">
                  {m.createdAt.toLocaleString("en-BD", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Td>
                <Td>
                  <Link
                    href={`/admin/products/${m.productId}/edit`}
                    className="font-medium text-stone-900 hover:text-accent hover:underline"
                  >
                    {m.productName}
                  </Link>
                  {m.option && <span className="text-stone-500"> — {m.option}</span>}
                </Td>
                <Td>
                  <span
                    className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${TYPES[m.type].cls}`}
                  >
                    {TYPES[m.type].label}
                  </span>
                </Td>
                <Td
                  numeric
                  className={m.delta > 0 ? "font-semibold text-success-fg" : "font-semibold text-danger-fg"}
                >
                  {m.delta > 0 ? `+${m.delta}` : m.delta}
                </Td>
                {/* Backfilled rows carry a real delta but no historical levels —
                    showing "0 → 0" would be a lie, so they read as unknown. */}
                <Td numeric className="text-stone-400">
                  {m.isBackfill ? "—" : m.beforeQty}
                </Td>
                <Td numeric className={m.isBackfill ? "text-stone-400" : "font-medium text-stone-700"}>
                  {m.isBackfill ? "—" : m.afterQty}
                </Td>
                <Td className="text-stone-500">
                  {m.orderId && m.orderNo ? (
                    <Link
                      href={`/admin/orders/${m.orderId}`}
                      className="font-spline-mono hover:text-accent hover:underline"
                    >
                      {m.orderNo}
                    </Link>
                  ) : (
                    <span className="text-[12px]">{m.reason ?? "—"}</span>
                  )}
                </Td>
                <Td numeric className="text-stone-500">
                  {m.unitCost != null ? formatTaka(m.unitCost) : "—"}
                </Td>
                <Td className="text-[12px] text-stone-500">{m.actorName}</Td>
              </Tr>
            ))}
            {result.rows.length === 0 && (
              <TableEmpty colSpan={9}>No movements on this page.</TableEmpty>
            )}
          </DataTable>

          {result.pageCount > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-500">
                Page {result.page} of {result.pageCount} · {result.total.toLocaleString("en-BD")}{" "}
                movement(s)
              </span>
              <div className="flex gap-2">
                {result.page > 1 && (
                  <Link
                    href={pageHref(result.page - 1)}
                    className="rounded-lg border border-stone-300 px-3 py-1.5 hover:border-stone-400"
                  >
                    Previous
                  </Link>
                )}
                {result.page < result.pageCount && (
                  <Link
                    href={pageHref(result.page + 1)}
                    className="rounded-lg border border-stone-300 px-3 py-1.5 hover:border-stone-400"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
