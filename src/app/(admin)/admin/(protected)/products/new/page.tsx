import { listAllCategories } from "@/server/categories/admin";
import { listActiveSizeGuides } from "@/server/size-guides";
import ProductForm from "../ProductForm";

export default async function NewProductPage() {
  const [categories, sizeGuides] = await Promise.all([listAllCategories(), listActiveSizeGuides()]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">New Product</h1>
      <ProductForm
        categories={categories}
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
