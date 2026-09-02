import { listSuppliers } from "@/server/purchasing";
import { listProductSourcing } from "@/server/purchasing/sourcing";
import BuySellClient, { type BuySellRow } from "./BuySellClient";

export const metadata = { title: "Buy & Sell Equal — FZ-Mart Admin" };

const DATE = new Intl.DateTimeFormat("en-BD", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function BuySellPage() {
  const [rows, suppliers] = await Promise.all([listProductSourcing(), listSuppliers()]);

  // Dates are formatted here rather than in the browser so every admin reads
  // the same string regardless of their machine's locale, and so the client
  // component never has to carry a Date across the boundary.
  const clientRows: BuySellRow[] = rows.map((r) => ({
    productId: r.productId,
    name: r.name,
    status: r.status,
    price: r.price,
    wasPrice: r.wasPrice,
    stock: r.stock,
    variantCount: r.variantCount,
    sourced: r.sourced,
    unitsPurchased: r.unitsPurchased,
    lastPurchase: r.lastPurchase
      ? {
          poId: r.lastPurchase.poId,
          poNo: r.lastPurchase.poNo,
          supplierName: r.lastPurchase.supplierName,
          on: DATE.format(r.lastPurchase.on),
          isBackfill: r.lastPurchase.isBackfill,
        }
      : null,
    lastUpdated: DATE.format(r.lastActivity),
  }));

  return (
    <BuySellClient
      rows={clientRows}
      suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
