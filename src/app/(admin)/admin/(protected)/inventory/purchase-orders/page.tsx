import Link from "next/link";
import type { PurchaseOrderStatus } from "@prisma/client";
import { listPurchaseOrders } from "@/server/purchasing";
import { formatTaka } from "@/lib/money";
import { DataTable, Th, Td, Tr, TableEmpty } from "@/components/admin/ui/DataTable";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { Badge, type BadgeTone } from "@/components/admin/ui/Badge";

export const metadata = { title: "Purchase Orders — FZ-Mart Admin" };

const STATUS: Record<PurchaseOrderStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  ORDERED: { label: "Ordered", tone: "accent" },
  RECEIVED: { label: "Received", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export default async function PurchaseOrdersPage() {
  const orders = await listPurchaseOrders();

  return (
    <div className="space-y-6 px-4 py-8 sm:px-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
            Purchase Orders
          </h1>
          <p className="mt-1 text-[13.5px] text-stone-500">
            What you have ordered from suppliers. Outstanding units on a placed order count as
            incoming stock; receiving them raises stock through the ledger.
          </p>
        </div>
        <Link
          href="/admin/inventory/purchase-orders/new"
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
        >
          New order
        </Link>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon="box"
          title="No purchase orders yet"
          description="Write one to track what you have ordered and when it should arrive."
          action={{
            label: "New order",
            href: "/admin/inventory/purchase-orders/new",
            icon: "plus",
          }}
        />
      ) : (
        <DataTable
          head={
            <tr>
              <Th>Order</Th>
              <Th>Supplier</Th>
              <Th align="right">Lines</Th>
              <Th align="right">Received</Th>
              <Th align="right">Value</Th>
              <Th>Expected</Th>
              <Th>Status</Th>
            </tr>
          }
        >
          {orders.map((po) => {
            const ordered = po.lines.reduce((s, l) => s + l.quantity, 0);
            const received = po.lines.reduce((s, l) => s + l.receivedQty, 0);
            const value = po.lines.reduce((s, l) => s + l.unitCost * l.quantity, 0);
            const partial = received > 0 && received < ordered;

            return (
              <Tr key={po.id}>
                <Td>
                  <Link
                    href={`/admin/inventory/purchase-orders/${po.id}`}
                    className="font-spline-mono font-medium text-stone-900 hover:text-accent hover:underline"
                  >
                    {po.poNo}
                  </Link>
                </Td>
                <Td className="text-stone-600">{po.supplier.name}</Td>
                <Td numeric className="text-stone-500">
                  {po.lines.length}
                </Td>
                <Td numeric className={partial ? "font-medium text-warning-fg" : "text-stone-500"}>
                  {received} / {ordered}
                </Td>
                <Td numeric className="font-medium text-stone-900">
                  {formatTaka(value)}
                </Td>
                <Td className="text-stone-500">
                  {po.expectedOn
                    ? po.expectedOn.toLocaleDateString("en-BD", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </Td>
                <Td>
                  <Badge tone={STATUS[po.status].tone}>
                    {/* "Partially received" is derived from the lines, never
                        stored, so it can't disagree with them. */}
                    {po.status === "ORDERED" && partial ? "Part received" : STATUS[po.status].label}
                  </Badge>
                </Td>
              </Tr>
            );
          })}
          {orders.length === 0 && <TableEmpty colSpan={7}>No purchase orders.</TableEmpty>}
        </DataTable>
      )}
    </div>
  );
}
