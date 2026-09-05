import { notFound } from "next/navigation";
import { getProductById } from "@/server/products/admin";
import { listAllCategories } from "@/server/categories/admin";
import { listActiveSizeGuides } from "@/server/size-guides";
import { getVariantLandedCosts, getFinishingSource } from "@/server/purchasing";
import ProductForm from "../../ProductForm";
import FinishingFromPo from "./FinishingFromPo";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ po?: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);
  // Set when the admin came from a purchase order's "Finish it". Anything else
  // in the query string is somebody typing, so a bad value simply means no
  // banner rather than an error page. Resolved alongside the rest rather than
  // before them — it is one more read of the same database, and making the
  // page wait for it in series would cost a round-trip for a banner.
  const poId = Number((await searchParams).po);
  const [product, categories, sizeGuides, landedCosts, finishingSource] = await Promise.all([
    getProductById(productId),
    listAllCategories(),
    listActiveSizeGuides(),
    getVariantLandedCosts(productId),
    Number.isInteger(poId) && poId > 0 ? getFinishingSource(poId, productId) : null,
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      {finishingSource && <FinishingFromPo source={finishingSource} />}
      <ProductForm
        categories={categories}
        product={product}
        // Arriving from a purchase order means the admin is writing this
        // product for the first time, not revising one — the row exists only
        // because receiving stock had to put it somewhere.
        fromSupplier={!!finishingSource}
        // A Map can't cross the server/client boundary, so it goes as a plain
        // object keyed by variant id; the form re-keys it by colour/size.
        landedCosts={Object.fromEntries(landedCosts)}
        sizeGuides={sizeGuides.map((g) => ({
          id: g.id,
          name: g.name,
          sizeLabel: g.sizeLabel,
          chart: g.chart,
          values: g.values.map((v) => v.value),
        }))}
      />
    </div>
  );
}
