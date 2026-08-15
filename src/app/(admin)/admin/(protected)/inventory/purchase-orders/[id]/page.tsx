import Link from "next/link";
import { notFound } from "next/navigation";
import { getPurchaseOrder } from "@/server/purchasing";
import { formatTaka } from "@/lib/money";
import { Badge } from "@/components/admin/ui/Badge";
import PurchaseOrderControls from "./PurchaseOrderControls";
import ReceivePanel from "./ReceivePanel";

export const metadata = { title: "Purchase Order — FZ-Mart Admin" };

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const po = await getPurchaseOrder(Number(id));
  if (!po) notFound();

  const goodsValue = po.lines.reduce((s, l) => s + l.unitCost * l.quantity, 0);
  const overhead = po.shippingCost + po.customsCost;
  const orderedUnits = po.lines.reduce((s, l) => s + l.quantity, 0);
  const receivedUnits = po.lines.reduce((s, l) => s + l.receivedQty, 0);
  const outstanding = orderedUnits - receivedUnits;

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
          {po.shippingCost > 0 && (
            <div className="flex justify-between text-stone-600">
              <span>Freight</span>
              <span className="nums">{formatTaka(po.shippingCost)}</span>
            </div>
          )}
          {po.customsCost > 0 && (
            <div className="flex justify-between text-stone-600">
              <span>Customs / clearing</span>
              <span className="nums">{formatTaka(po.customsCost)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-stone-100 pt-1.5 text-base font-bold text-stone-900">
            <span>Total</span>
            <span className="nums">{formatTaka(goodsValue + overhead)}</span>
          </div>
        </div>

        {overhead > 0 && (
          <p className="mt-3 rounded-md bg-stone-50 px-3 py-2 text-[11.5px] leading-relaxed text-stone-500">
            Freight and customs are spread across the lines by value when you receive them, so each
            product&rsquo;s landed cost — and therefore its profit margin — reflects what it really
            cost to get here, not just the supplier&rsquo;s invoice price.
          </p>
        )}
      </div>

      {/* Receiving */}
      {po.status === "ORDERED" && (
        <ReceivePanel
          id={po.id}
          lines={po.lines.map((l) => ({
            id: l.id,
            label: l.variantLabel ? `${l.productName} — ${l.variantLabel}` : l.productName,
            quantity: l.quantity,
            receivedQty: l.receivedQty,
          }))}
        />
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
