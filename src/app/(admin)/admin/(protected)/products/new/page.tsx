import { listAllCategories } from "@/server/categories/admin";
import { listActiveSizeGuides } from "@/server/size-guides";
import { listSuppliers } from "@/server/purchasing";
import NewProductStart from "./NewProductStart";

export default async function NewProductPage() {
  const [categories, sizeGuides, suppliers] = await Promise.all([
    listAllCategories(),
    listActiveSizeGuides(),
    // Active suppliers only: this is a "what do I buy from them" picker, and a
    // supplier the shop has stopped using is not somewhere new stock comes
    // from. Their old products remain reachable from the products list.
    listSuppliers(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">New Product</h1>
      <NewProductStart
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
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
