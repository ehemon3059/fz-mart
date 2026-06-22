import Link from "next/link";
import { listAllCategories } from "@/server/categories/admin";
import DeleteButton from "@/components/admin/DeleteButton";
import { removeCategory, removeSubcategory } from "./actions";
import SubcategoryForm from "./SubcategoryForm";

export default async function AdminCategoriesPage() {
  const categories = await listAllCategories();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <Link
          href="/admin/categories/new"
          className="bg-black text-white px-4 py-2 rounded text-sm font-medium"
        >
          + New Category
        </Link>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => (
          <div key={cat.id} className="border rounded-lg bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold">{cat.name}</span>{" "}
                <span className="text-xs text-gray-400">/{cat.slug}</span>
                {!cat.isActive && (
                  <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex gap-3 text-sm">
                <Link href={`/admin/categories/${cat.id}/edit`} className="underline">
                  Edit
                </Link>
                <DeleteButton action={removeCategory} id={cat.id} label="category" />
              </div>
            </div>

            <div className="mt-3 pl-4 border-l space-y-2">
              {cat.subcategories.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between text-sm">
                  <span>
                    {sub.name}{" "}
                    <span className="text-xs text-gray-400">/{sub.slug}</span>
                    {!sub.isActive && (
                      <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                        Inactive
                      </span>
                    )}
                  </span>
                  <DeleteButton
                    action={removeSubcategory}
                    id={sub.id}
                    label="subcategory"
                  />
                </div>
              ))}
              <SubcategoryForm categoryId={cat.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
