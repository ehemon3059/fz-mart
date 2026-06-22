import { notFound } from "next/navigation";
import { getProductById } from "@/server/products/admin";
import { listAllSubcategories } from "@/server/categories/admin";
import ProductForm from "../../ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, subcategories] = await Promise.all([
    getProductById(Number(id)),
    listAllSubcategories(),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
      <ProductForm subcategories={subcategories} product={product} />
    </div>
  );
}
