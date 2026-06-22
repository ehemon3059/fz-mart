import { notFound } from "next/navigation";
import { getCategoryById } from "@/server/categories/admin";
import CategoryForm from "../../CategoryForm";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await getCategoryById(Number(id));
  if (!category) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit Category</h1>
      <CategoryForm category={category} />
    </div>
  );
}
