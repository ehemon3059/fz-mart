import Link from "next/link";
import type { PurchaseOrderStatus } from "@prisma/client";
import { countPurchaseOrdersByStatus, listPurchaseOrders } from "@/server/purchasing";
import { formatTaka } from "@/lib/money";
import { DataTable, Th, Td, Tr, TableEmpty } from "@/components/admin/ui/DataTable";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { Badge, type BadgeTone } from "@/components/admin/ui/Badge";
import PurchaseOrderRowActions from "./PurchaseOrderRowActions";

export const metadata = { title: "Purchase Orders — FZ-Mart Admin" };

const STATUS: Record<PurchaseOrderStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  ORDERED: { label: "Ordered", tone: "accent" },
  RECEIVED: { label: "Received", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

const TABS: Array<PurchaseOrderStatus | "ALL"> = [
  "ALL",
  "DRAFT",
  "ORDERED",
  "RECEIVED",
  "CANCELLED",
];

/** A tab's URL. Page is always dropped — page 4 of Draft rarely exists in Received. */
function tabHref(tab: PurchaseOrderStatus | "ALL"): string {
  return tab === "ALL"
    ? "/admin/inventory/purchase-orders"
    : `/admin/inventory/purchase-orders?status=${tab}`;
}

function pageHref(status: PurchaseOrderStatus | undefined, page: number): string {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `/admin/inventory/purchase-orders${qs ? `?${qs}` : ""}`;
}

/** Unknown ?status= values fall back to "all" rather than showing an empty table. */
function parseStatus(value: string | undefined): PurchaseOrderStatus | undefined {
  return value && value !== "ALL" && value in STATUS ? (value as PurchaseOrderStatus) : undefined;
}

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const page = Math.max(1, Number(sp.page) || 1);

  const [result, counts] = await Promise.all([
    listPurchaseOrders({ status, page }),
    countPurchaseOrdersByStatus(),
  ]);
  const orders = result.orders;

  const totalAll = counts.DRAFT + counts.ORDERED + counts.RECEIVED + counts.CANCELLED;
  const firstOnPage = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const lastOnPage = Math.min(result.page * result.pageSize, result.total);

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

      {totalAll === 0 ? (
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
        <>
          {/* Status tabs. The counts are of the whole table, not of this page,
              so they answer "how many are there" rather than "how many fit". */}
          <div className="flex flex-wrap gap-2 text-sm">
            {TABS.map((tab) => {
              const active = (status ?? "ALL") === tab;
              const count = tab === "ALL" ? totalAll : counts[tab];
              return (
                <Link
                  key={tab}
                  href={tabHref(tab)}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full border px-3.5 py-1.5 font-medium transition ${
                    active
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                  }`}
                >
                  {tab === "ALL" ? "All" : STATUS[tab].label}
                  <span className={`nums ml-1.5 ${active ? "text-white/60" : "text-stone-400"}`}>
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>

          <p className="text-[13px] text-stone-500">
            {result.total === 0
              ? "No orders in this tab."
              : `Showing ${firstOnPage}–${lastOnPage} of ${result.total} order${
                  result.total === 1 ? "" : "s"
                }, most recently updated first`}
          </p>

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
                <Th align="right">
                  <span className="sr-only">Actions</span>
                </Th>
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
                  <Td
                    numeric
                    className={partial ? "font-medium text-warning-fg" : "text-stone-500"}
                  >
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
                      {po.status === "ORDERED" && partial
                        ? "Part received"
                        : STATUS[po.status].label}
                    </Badge>
                  </Td>
                  <Td>
                    {/* Draft and cancelled orders that took no delivery are
                        clutter, and clearing them is the one thing this list
                        could not do without opening each one first. */}
                    <PurchaseOrderRowActions
                      id={po.id}
                      poNo={po.poNo}
                      canDelete={
                        received === 0 && (po.status === "DRAFT" || po.status === "CANCELLED")
                      }
                    />
                  </Td>
                </Tr>
              );
            })}
            {orders.length === 0 && (
              <TableEmpty colSpan={8}>
                {status
                  ? `No ${STATUS[status].label.toLowerCase()} purchase orders.`
                  : "No purchase orders."}
              </TableEmpty>
            )}
          </DataTable>

          {result.pageCount > 1 && (
            <div className="flex items-center justify-between text-[13px]">
              <Link
                href={pageHref(status, result.page - 1)}
                aria-disabled={result.page <= 1}
                className={`rounded-lg border border-stone-200 px-3 py-1.5 font-medium text-stone-600 ${
                  result.page <= 1 ? "pointer-events-none opacity-40" : "hover:border-stone-400"
                }`}
              >
                ← Previous
              </Link>
              <span className="text-stone-500">
                Page {result.page} of {result.pageCount}
              </span>
              <Link
                href={pageHref(status, result.page + 1)}
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
          )}
        </>
      )}
    </div>
  );
}
