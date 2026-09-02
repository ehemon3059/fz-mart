 "use server";

import type { ProductStatus, PurchaseOrderStatus } from "@prisma/client";
import { requirePermission } from "@/server/admin/guard";
import { listSupplierProducts } from "@/server/purchasing/supplier-products";

/**
 * One purchased product as the sourcing panel renders it.
 *
 * Same shape as SupplierProductRow with the Date flattened to a string: dates
 * are formatted on the server so every admin reads the same one regardless of
 * their machine's locale, and so no Date has to cross the boundary.
 */
export interface SupplierProductView {
  productId: number;
  name: string;
  status: ProductStatus;
  imageUrl: string | null;
  variantCount: number;
  price: number | null;
  unpricedOptions: number;
  onHand: number;
  reserved: number;
  listedQty: number | null;
  available: number;
  unitsPurchased: number;
  incoming: number;
  lastPurchase: {
    poId: number;
    poNo: string;
    status: PurchaseOrderStatus;
    /** Pre-formatted on the server. */
    on: string;
    isBackfill: boolean;
    unitCost: number;
    isLanded: boolean;
  };
}

const DATE = new Intl.DateTimeFormat("en-BD", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/**
 * Products bought from one supplier, loaded when the admin picks them.
 *
 * Fetched on demand rather than shipped with the page: a shop with fifty
 * suppliers would otherwise send every product of every one of them to the
 * browser to populate a list that only ever shows one supplier's.
 */
export async function loadSupplierProductsAction(
  supplierId: number,
): Promise<{ error?: string; rows?: SupplierProductView[] }> {
  await requirePermission("products");

  if (!Number.isInteger(supplierId) || supplierId <= 0) {
    return { error: "Choose a supplier first." };
  }

  const rows = await listSupplierProducts(supplierId);
  return {
    rows: rows.map((r) => ({
      ...r,
      lastPurchase: { ...r.lastPurchase, on: DATE.format(r.lastPurchase.on) },
    })),
  };
}
