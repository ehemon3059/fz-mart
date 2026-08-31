import { notFound } from "next/navigation";
import { getProductById } from "@/server/products/admin";
import { listAllCategories } from "@/server/categories/admin";
import { listStockHistory } from "@/server/inventory";
import { listActiveSizeGuides } from "@/server/size-guides";
import { onHandUnits, variantsCarryStock } from "@/lib/product-stock";
import ProductForm from "../../ProductForm";
import StockPanel from "./StockPanel";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);
  const [product, categories, history, sizeGuides] = await Promise.all([
    getProductById(productId),
    listAllCategories(),
    listStockHistory(productId),
    listActiveSizeGuides(),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
      <ProductForm
        categories={categories}
        product={product}
      sizeGuides={sizeGuides.map((g) => ({
        id: g.id,
        name: g.name,
        sizeLabel: g.sizeLabel,
        chart: g.chart,
        values: g.values.map((v) => v.value),
      }))}
      />

      {/* Matches the form above, which is now full-bleed — a centred column here
          would sit oddly under a full-width form. */}
      <div className="w-full px-5 lg:px-8">
        <StockPanel
          productId={product.id}
          currentStock={onHandUnits(product)}
          variantBacked={variantsCarryStock(product)}
          history={history.map((h) => ({
            id: h.id,
            delta: h.delta,
            newStock: h.afterQty,
            type: h.type,
            reason: h.reason,
            actorName: h.actorName,
            createdAt: h.createdAt.toLocaleString("en-BD"),
          }))}
        />
      </div>
    </div>
  );
}
