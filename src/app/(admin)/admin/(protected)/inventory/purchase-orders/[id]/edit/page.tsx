import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPurchaseOrder, listSuppliers } from "@/server/purchasing";
import { listAllCategories } from "@/server/categories/admin";
import { ancestorsOf } from "@/server/categories/tree";
import PurchaseOrderForm from "../../new/PurchaseOrderForm";

export const metadata = { title: "Edit Purchase Order — FZ-Mart Admin" };

/** "2026-08-27" for a date input. */
function isoDate(d: Date | null): string {
  if (!d) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export default async function EditPurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const po = await getPurchaseOrder(Number(id));
  if (!po) notFound();

  // Only a draft is editable. Anything placed is a document the supplier also
  // holds — sending them a second, different version of the same PO number is
  // worse than writing a new order, so the detail page is the end of the road.
  if (po.status !== "DRAFT") {
    redirect(`/admin/inventory/purchase-orders/${po.id}`);
  }

  const [suppliers, products, categories] = await Promise.all([
    listSuppliers(),
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
  ]);

  const categoryOptions = categories
    .map((c) => ({
      id: c.id,
      path: [...ancestorsOf(c.id, categories).map((a) => a.name), c.name].join(" › "),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  return (
    <div className="space-y-6 px-4 py-8 sm:px-7">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
          Edit {po.poNo}
        </h1>
        <Link
          href={`/admin/inventory/purchase-orders/${po.id}`}
          className="text-sm text-stone-500 underline-offset-2 hover:text-accent hover:underline"
        >
          Back to order
        </Link>
      </div>

      <PurchaseOrderForm
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        categories={categoryOptions}
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
        order={{
          id: po.id,
          supplierId: po.supplierId,
          expectedOn: isoDate(po.expectedOn),
          // Money is stored in paisa and typed in taka.
          shippingCost: po.shippingCost ? String(po.shippingCost / 100) : "",
          customsCost: po.customsCost ? String(po.customsCost / 100) : "",
          note: po.note ?? "",
          lines: po.lines.map((l) => ({
            productId: String(l.productId),
            variantId: l.variantId != null ? String(l.variantId) : "",
            quantity: String(l.quantity),
            unitCost: String(l.unitCost / 100),
          })),
        }}
      />
    </div>
  );
}
