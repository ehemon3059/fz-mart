import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPurchaseOrder,
  getUnsellableReceived,
  purchaseOrderTotal,
  shipmentOverhead,
} from "@/server/purchasing";
import { formatTaka } from "@/lib/money";
import { Badge } from "@/components/admin/ui/Badge";
import PurchaseOrderControls from "./PurchaseOrderControls";
import ReceivePanel from "./ReceivePanel";
import { listLocations, getDefaultLocation } from "@/server/inventory/locations";
import PaymentsPanel from "./PaymentsPanel";

export const metadata = { title: "Purchase Order — FZ-Mart Admin" };

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const po = await getPurchaseOrder(Number(id));
  if (!po) notFound();

  // Where a delivery can land. Empty for a shop that keeps no locations, in
  // which case the receive panel simply doesn't ask.
  const [locations, defaultLocation] = await Promise.all([listLocations(), getDefaultLocation()]);

  // Goods that arrived against this order but still cannot be sold. Nothing to
  // compute until something has actually been received.
  const unsellable = po.lines.some((l) => l.receivedQty > 0)
    ? await getUnsellableReceived(po.id)
    : [];

  const goodsValue = po.lines.reduce((s, l) => s + l.unitCost * l.quantity, 0);
  const overhead = shipmentOverhead(po);

  // Only the costs this shipment actually had. A delivery with no freight and
  // no customs should not show two zero rows implying someone forgot to fill
  // them in — the absence IS the answer.
  const shipmentCosts = [
    { label: "Freight", amount: po.shippingCost },
    { label: "Customs / clearing", amount: po.customsCost },
    { label: "Load / unload (লেবার)", amount: po.labourCost },
    { label: "Miscellaneous (বিবিধ)", amount: po.miscCost },
  ].filter((c) => c.amount > 0);
  const orderedUnits = po.lines.reduce((s, l) => s + l.quantity, 0);
  const receivedUnits = po.lines.reduce((s, l) => s + l.receivedQty, 0);
  const outstanding = orderedUnits - receivedUnits;

  // What the order costs in total, against what has actually been handed over.
  const orderTotal = purchaseOrderTotal(po);
  const paidTotal = po.payments.reduce((sum, p) => sum + p.amount, 0);
  const dueTotal = orderTotal - paidTotal;
  const today = new Date();
  const todayIso = new Date(today.getTime() - today.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);

  return (
    <div className="max-w-4xl space-y-6 px-4 py-8 sm:px-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-spline-mono text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
            {po.poNo}
          </h1>
          <p className="mt-1 text-[13.5px] text-stone-500">
            {po.supplier.name}
            {po.expectedOn && (
              <>
                {" · expected "}
                {po.expectedOn.toLocaleDateString("en-BD", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </>
            )}
          </p>
        </div>
        <Link
          href="/admin/inventory/purchase-orders"
          className="text-sm text-stone-500 underline-offset-2 hover:text-accent hover:underline"
        >
          All orders
        </Link>
      </div>

      <PurchaseOrderControls
        id={po.id}
        status={po.status}
        poNo={po.poNo}
        hasReceipts={receivedUnits > 0}
      />

      {/* Lines */}
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
        <h2 className="mb-3 text-[13px] font-semibold text-stone-900">Products</h2>
        <div className="divide-y divide-stone-100 text-sm">
          {po.lines.map((l) => {
            const remaining = l.quantity - l.receivedQty;
            return (
              <div key={l.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <span className="font-medium text-stone-800">{l.productName}</span>
                  {l.variantLabel && <span className="text-stone-500"> — {l.variantLabel}</span>}
                  <div className="text-[11.5px] text-stone-400">
                    {l.quantity} × {formatTaka(l.unitCost)}
                    {l.receivedQty > 0 && (
                      <>
                        {" · "}
                        <span className={remaining > 0 ? "text-warning-fg" : "text-success-fg"}>
                          {l.receivedQty} received
                          {remaining > 0 ? `, ${remaining} outstanding` : ""}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span className="nums font-medium text-stone-900">
                  {formatTaka(l.unitCost * l.quantity)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-3 space-y-1 border-t border-stone-200 pt-3 text-sm">
          <div className="flex justify-between text-stone-600">
            <span>Goods</span>
            <span className="nums">{formatTaka(goodsValue)}</span>
          </div>
          {shipmentCosts.map((c) => (
            <div key={c.label} className="flex justify-between text-stone-600">
              <span>{c.label}</span>
              <span className="nums">{formatTaka(c.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-stone-100 pt-1.5 text-base font-bold text-stone-900">
            <span>Total</span>
            <span className="nums">{formatTaka(goodsValue + overhead)}</span>
          </div>
        </div>

        {overhead > 0 && (
          <p className="mt-3 rounded-md bg-stone-50 px-3 py-2 text-[11.5px] leading-relaxed text-stone-500">
            These shipment costs are spread across the lines by value when you receive them, so
            each product&rsquo;s landed cost — and therefore its profit margin — reflects what it
            really cost to get here, not just the supplier&rsquo;s invoice price.
          </p>
        )}
      </div>

      {/* Receiving */}
      {po.status === "ORDERED" && (
        <ReceivePanel
          id={po.id}
          locations={locations.map((l) => ({ id: l.id, name: l.name }))}
          defaultLocationId={defaultLocation?.id ?? null}
          lines={po.lines.map((l) => ({
            id: l.id,
            label: l.variantLabel ? `${l.productName} — ${l.variantLabel}` : l.productName,
            quantity: l.quantity,
            receivedQty: l.receivedQty,
          }))}
        />
      )}

      {unsellable.length > 0 && (
        <div className="rounded-lg border border-warning/40 bg-warning-soft px-4 py-3.5">
          <h2 className="text-[13px] font-semibold text-warning-fg">
            {unsellable.length} product{unsellable.length === 1 ? "" : "s"} received but not on sale
            yet
          </h2>
          <p className="mt-0.5 text-[12.5px] text-stone-600">
            These units are in stock and counted, but no shopper can buy them until each one is
            finished.
          </p>
          <ul className="mt-3 space-y-2">
            {unsellable.map((row) => (
              <li
                key={row.productId}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-warning/20 pt-2"
              >
                <span className="text-[13px] font-medium text-stone-800">
                  {row.name}
                  <span className="ml-2 text-[12px] font-normal text-stone-500">
                    {row.receivedQty} received
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-[12.5px] text-stone-600">Needs {row.missing.join(", ")}</span>
                  <Link
                    href={`/admin/products/${row.productId}/edit`}
                    className="text-[12.5px] font-semibold text-accent underline-offset-2 hover:underline"
                  >
                    Finish it
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {po.status === "RECEIVED" && (
        <div className="rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-[13px] text-success-fg">
          Fully received{po.receivedAt && ` on ${po.receivedAt.toLocaleDateString("en-BD")}`}. Every
          unit was added to stock through the ledger —{" "}
          <Link
            href={`/admin/inventory/movements?type=PURCHASE`}
            className="underline underline-offset-2"
          >
            view the movements
          </Link>
          .
        </div>
      )}

      {po.status === "DRAFT" && outstanding > 0 && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-[13px] text-stone-600">
          This is still a draft — its {outstanding} unit(s) do not count as incoming yet. Place the
          order once you have sent it to the supplier.
        </div>
      )}

      <PaymentsPanel
        purchaseOrderId={po.id}
        total={formatTaka(orderTotal)}
        paid={formatTaka(paidTotal)}
        due={formatTaka(dueTotal)}
        fullyPaid={dueTotal <= 0}
        canRecord={po.status !== "CANCELLED"}
        today={todayIso}
        payments={po.payments.map((p) => ({
          id: p.id,
          amount: formatTaka(p.amount),
          paidOn: p.paidOn.toLocaleDateString("en-BD", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          method: p.method,
          note: p.note,
          actorName: p.actorName,
        }))}
      />

      {po.note && (
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
          <h2 className="mb-1 text-[13px] font-semibold text-stone-900">Note</h2>
          <p className="whitespace-pre-line text-sm text-stone-600">{po.note}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-[12px] text-stone-400">
        <span>Created {po.createdAt.toLocaleString("en-BD")}</span>
        {po.orderedAt && <span>Placed {po.orderedAt.toLocaleString("en-BD")}</span>}
        {po.receivedAt && <span>Received {po.receivedAt.toLocaleString("en-BD")}</span>}
        <Badge tone="neutral">{po.status}</Badge>
      </div>
    </div>
  );
}
