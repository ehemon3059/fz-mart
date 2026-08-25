import Link from "next/link";
import { notFound } from "next/navigation";
import { getStockTake } from "@/server/inventory/stocktake";
import { Badge } from "@/components/admin/ui/Badge";
import CountClient from "./CountClient";

export const metadata = { title: "Stock-take — FZ-Mart Admin" };

const STATUS_TONE = {
  OPEN: "warning",
  COMMITTED: "success",
  CANCELLED: "neutral",
} as const;

export default async function StockTakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const take = await getStockTake(Number(id));
  if (!take) notFound();

  return (
    <div className="max-w-4xl space-y-6 px-4 py-8 sm:px-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-spline-mono text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
            {take.reference}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {take.location?.name ?? "No location"} · started{" "}
            {take.startedAt.toLocaleDateString("en-BD", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}{" "}
            by {take.actorName}
            {take.committedAt &&
              ` · applied ${take.committedAt.toLocaleDateString("en-BD", {
                day: "2-digit",
                month: "short",
              })}`}
          </p>
          {take.note && <p className="mt-1 text-[13px] text-stone-500">{take.note}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={STATUS_TONE[take.status]}>{take.status}</Badge>
          <Link
            href="/admin/inventory/stock-takes"
            className="text-sm text-stone-500 underline-offset-2 hover:text-accent hover:underline"
          >
            All stock-takes
          </Link>
        </div>
      </div>

      <CountClient
        stockTakeId={take.id}
        reference={take.reference}
        isOpen={take.status === "OPEN"}
        lines={take.lines.map((l) => ({
          id: l.id,
          productId: l.productId,
          variantId: l.variantId,
          productName: l.productName,
          variantLabel: l.variantLabel,
          expectedQty: l.expectedQty,
          countedQty: l.countedQty,
          note: l.note,
        }))}
      />
    </div>
  );
}
