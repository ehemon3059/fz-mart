import Link from "next/link";
import { listAllProducts } from "@/server/products/admin";
import { formatTaka } from "@/lib/money";
import DeleteButton from "@/components/admin/DeleteButton";
import { removeProduct } from "./actions";

export default async function AdminProductsPage() {
  const products = await listAllProducts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <Link
          href="/admin/products/new"
          className="bg-black text-white px-4 py-2 rounded text-sm font-medium"
        >
          + New Product
        </Link>
      </div>

      <div className="border rounded-lg bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Stock</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2 font-medium">{p.name}</td>
                <td className="px-4 py-2 text-gray-500">
                  {p.subcategory.category.name} / {p.subcategory.name}
                </td>
                <td className="px-4 py-2">
                  {formatTaka(p.discountPrice ?? p.price)}
                  {p.discountPrice != null && (
                    <span className="ml-1 text-xs text-gray-400 line-through">
                      {formatTaka(p.price)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <span className={p.stock <= 0 ? "text-red-600 font-medium" : ""}>
                    {p.stock}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      p.status === "ACTIVE" ? "text-green-700" : "text-gray-400"
                    }
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-3 justify-end">
                    <Link href={`/admin/products/${p.id}/edit`} className="underline">
                      Edit
                    </Link>
                    <DeleteButton action={removeProduct} id={p.id} label="product" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
