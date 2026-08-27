import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listSuppliers } from "@/server/purchasing";
import { listAllCategories } from "@/server/categories/admin";
import { listActiveSizeGuides } from "@/server/size-guides";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import PurchaseOrderForm from "./PurchaseOrderForm";

export const metadata = { title: "New Purchase Order — FZ-Mart Admin" };

export default async function NewPurchaseOrderPage() {
  const [suppliers, products, categories, sizeGuides] = await Promise.all([
    listSuppliers(),
    // DRAFT products are included deliberately: a draft exists precisely so it
    // can be ordered against before it is finished.
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        purchaseCost: true,
        variants: {
          select: { id: true, size: true, colorName: true, purchaseCost: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    listAllCategories(),
    listActiveSizeGuides(),
  ]);

  // A purchase order without a supplier is meaningless, so send the admin to
  // create one rather than showing a form they can't submit.
  if (suppliers.length === 0) {
    return (
      <div className="space-y-6 px-4 py-8 sm:px-7">
        <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
          New Purchase Order
        </h1>
        <EmptyState
          icon="users"
          title="Add a supplier first"
          description="A purchase order is placed with a supplier, so you need at least one before writing an order."
          action={{ label: "Add supplier", href: "/admin/inventory/suppliers/new", icon: "plus" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-8 sm:px-7">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
          New Purchase Order
        </h1>
        <Link
          href="/admin/inventory/purchase-orders"
          className="text-sm text-stone-500 underline-offset-2 hover:text-accent hover:underline"
        >
          All orders
        </Link>
      </div>

      <PurchaseOrderForm
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        categories={categories}
        sizeGuides={sizeGuides.map((g) => ({
          id: g.id,
          name: g.name,
          sizeLabel: g.sizeLabel,
          chart: g.chart,
          values: g.values.map((v) => v.value),
        }))}
        products={products.map((p) => ({
          id: p.id,
          name: p.status === "DRAFT" ? `${p.name} (draft)` : p.name,
          purchaseCost: p.purchaseCost,
          variants: p.variants.map((v) => ({
            id: v.id,
            label: [v.colorName, v.size].filter(Boolean).join(" / ") || "Option",
            purchaseCost: v.purchaseCost,
          })),
        }))}
      />
    </div>
  );
}
