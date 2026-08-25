import Link from "next/link";
import { listSuppliers, getSupplierBalances } from "@/server/purchasing";
import { formatTaka } from "@/lib/money";
import { DataTable, Th, Td, Tr, TableEmpty } from "@/components/admin/ui/DataTable";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { Badge } from "@/components/admin/ui/Badge";
import SupplierActions from "./SupplierActions";

export const metadata = { title: "Suppliers — FZ-Mart Admin" };

export default async function SuppliersPage() {
  const [suppliers, balances] = await Promise.all([listSuppliers(true), getSupplierBalances()]);
  // Outstanding balance per supplier, so "who do I still owe?" is answerable
  // from the list rather than by opening every order one at a time.
  const dueBySupplier = new Map(balances.map((b) => [b.supplierId, b.due]));

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

      {suppliers.length === 0 ? (
        <EmptyState
          icon="users"
          title="No suppliers yet"
          description="Add a supplier before writing your first purchase order."
          action={{ label: "Add supplier", href: "/admin/inventory/suppliers/new", icon: "plus" }}
        />
      ) : (
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
                {s._count.purchaseOrders}
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
                <SupplierActions id={s.id} name={s.name} hasOrders={s._count.purchaseOrders > 0} />
              </Td>
            </Tr>
          ))}
          {suppliers.length === 0 && <TableEmpty colSpan={6}>No suppliers.</TableEmpty>}
        </DataTable>
      )}
    </div>
  );
}
