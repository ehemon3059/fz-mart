import type { StockMovementType } from "@prisma/client";
import { listMovements, listMovementProducts } from "@/server/inventory/reports";
import { formatTaka } from "@/lib/money";
import MovementsClient from "./MovementsClient";

export const metadata = { title: "Stock Movements — FZ-Mart Admin" };

const ALL_TYPES: StockMovementType[] = [
  "SALE",
  "CANCEL_RESTOCK",
  "RETURN",
  "DAMAGE",
  "PURCHASE",
  "ADJUSTMENT",
];

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

  return (
    <MovementsClient
      rows={result.rows.map((m) => ({
        id: m.id,
        when: m.createdAt.toLocaleString("en-BD", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: m.type,
        delta: m.delta,
        beforeQty: m.beforeQty,
        afterQty: m.afterQty,
        unitCost: m.unitCost != null ? formatTaka(m.unitCost) : null,
        reason: m.reason,
        actorName: m.actorName,
        productId: m.productId,
        productName: m.productName,
        option: m.option,
        sku: m.sku,
        orderId: m.orderId,
        orderNo: m.orderNo,
        isBackfill: m.isBackfill,
      }))}
      products={products}
      total={result.total}
      page={result.page}
      pageCount={result.pageCount}
      active={{ product: sp.product, type: sp.type, from: sp.from, to: sp.to }}
    />
  );
}
