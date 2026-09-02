import Link from "next/link";
import { listSuppliersPage, getSupplierBalances } from "@/server/purchasing";
import { formatTaka } from "@/lib/money";
import { DataTable, Th, Td, Tr } from "@/components/admin/ui/DataTable";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { Badge } from "@/components/admin/ui/Badge";
import SupplierActions from "./SupplierActions";

export const metadata = { title: "Suppliers — FZ-Mart Admin" };

function pageHref(page: number): string {
  return page > 1
    ? `/admin/inventory/suppliers?page=${page}`
    : "/admin/inventory/suppliers";
}

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageRaw } = await searchParams;
  const result = await listSuppliersPage({ page: Math.max(1, Number(pageRaw) || 1) });
  const suppliers = result.suppliers;

  // Outstanding balance per supplier, so "who do I still owe?" is answerable
  // from the list rather than by opening every order one at a time. Asked only
  // about the rows on this page — the whole point of paginating is not to read
  // every supplier's order history to draw ten lines.
  const balances = await getSupplierBalances(suppliers.map((s) => s.id));
  const dueBySupplier = new Map(balances.map((b) => [b.supplierId, b.due]));

  const first = (result.page - 1) * result.pageSize + 1;
  const last = first + suppliers.length - 1;

  return (
    <div className="space-y-6 px-4 py-8 sm:px-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
            Suppliers
          </h1>
          <p className="mt-1 text-[13.5px] text-stone-500">
            Who you buy stock from. A supplier&rsquo;s lead time drives the reorder point for
            everything you buy from them.
          </p>
        </div>
        <Link
          href="/admin/inventory/suppliers/new"
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Add supplier
        </Link>
      </div>

      {result.total === 0 ? (
        <EmptyState
          icon="users"
          title="No suppliers yet"
          description="Add a supplier before writing your first purchase order."
          action={{ label: "Add supplier", href: "/admin/inventory/suppliers/new", icon: "plus" }}
        />
      ) : (
        <>
          <DataTable
            head={
              <tr>
                <Th>Supplier</Th>
                <Th>Contact</Th>
                <Th align="right">Lead time</Th>
                <Th align="right">Orders</Th>
                <Th align="right">Still owed</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            }
          >
            {suppliers.map((s) => (
              <Tr key={s.id}>
                <Td>
                  <Link
                    href={`/admin/inventory/suppliers/${s.id}/edit`}
                    className="font-medium text-stone-900 hover:text-accent hover:underline"
                  >
                    {s.name}
                  </Link>
                  {s.note && <div className="text-[11px] text-stone-400">{s.note}</div>}
                </Td>
                <Td className="text-stone-500">
                  {s.phone ?? s.email ?? <span className="text-stone-300">—</span>}
                </Td>
                <Td numeric className="text-stone-500">
                  {s.leadTimeDays != null ? `${s.leadTimeDays} days` : "—"}
                </Td>
                <Td numeric className="text-stone-500">
                  {s.orderCount}
                </Td>
                <Td numeric>
                  {(() => {
                    const due = dueBySupplier.get(s.id) ?? 0;
                    if (due <= 0) return <span className="text-stone-300">—</span>;
                    return <span className="font-semibold text-warning-fg">{formatTaka(due)}</span>;
                  })()}
                </Td>
                <Td>
                  <Badge tone={s.isActive ? "success" : "neutral"}>
                    {s.isActive ? "Active" : "Inactive"}
                  </Badge>
                </Td>
                <Td>
                  <SupplierActions
                    id={s.id}
                    name={s.name}
                    orderCount={s.orderCount}
                    ledgerLocked={s.ledgerLocked}
                  />
                </Td>
              </Tr>
            ))}
          </DataTable>

          <div className="flex items-center justify-between text-[13px]">
            <Link
              href={pageHref(result.page - 1)}
              aria-disabled={result.page <= 1}
              className={`rounded-lg border border-stone-200 px-3 py-1.5 font-medium text-stone-600 ${
                result.page <= 1 ? "pointer-events-none opacity-40" : "hover:border-stone-400"
              }`}
            >
              ← Previous
            </Link>
            <span className="text-stone-500">
              {/* The range, not just the page number: with a page size of ten it
                  is the faster way to see how long the list actually is. */}
              {first}–{last} of {result.total}
              {result.pageCount > 1 && ` · page ${result.page} of ${result.pageCount}`}
            </span>
            <Link
              href={pageHref(result.page + 1)}
              aria-disabled={result.page >= result.pageCount}
              className={`rounded-lg border border-stone-200 px-3 py-1.5 font-medium text-stone-600 ${
                result.page >= result.pageCount
                  ? "pointer-events-none opacity-40"
                  : "hover:border-stone-400"
              }`}
            >
              Next →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
