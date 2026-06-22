import { listAllSubcategories } from "@/server/categories/admin";
import ProductForm from "../ProductForm";

export default async function NewProductPage() {
  const subcategories = await listAllSubcategories();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">New Product</h1>
      <ProductForm subcategories={subcategories} />
    </div>
  );
}
