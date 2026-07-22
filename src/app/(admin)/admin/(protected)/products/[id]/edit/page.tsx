import { notFound } from "next/navigation";
import { getProductById } from "@/server/products/admin";
import { listAllCategories } from "@/server/categories/admin";
import { listStockHistory } from "@/server/inventory";
import ProductForm from "../../ProductForm";
import StockPanel from "./StockPanel";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);
  const [product, categories, history] = await Promise.all([
    getProductById(productId),
    listAllCategories(),
    listStockHistory(productId),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
      <ProductForm categories={categories} product={product} />

      <div className="mx-auto w-full max-w-[960px] px-5 lg:px-8">
        <StockPanel
          productId={product.id}
          currentStock={product.stock}
          history={history.map((h) => ({
            id: h.id,
            delta: h.delta,
            newStock: h.newStock,
            reason: h.reason,
            adminName: h.adminName,
            createdAt: h.createdAt.toLocaleString("en-BD"),
          }))}
        />
      </div>
    </div>
  );
}
