import { listAllCategories } from "@/server/categories/admin";
import { CategoriesClient } from "@/components/admin/categories/CategoriesClient";

export const metadata = { title: "Categories — FZ-Mart Admin" };

export default async function AdminCategoriesPage() {
  const categories = await listAllCategories();

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-7 py-8 pb-24 lg:pb-8">
      <div className="mb-8">
        <h1 className="text-[26px] font-extrabold tracking-tight text-stone-900">
          Categories
        </h1>
        <p className="mt-1 text-[14.5px] text-stone-500">
          Organize the catalog into categories and subcategories.
        </p>
      </div>

      <CategoriesClient initialCategories={categories} />
    </div>
  );
}
