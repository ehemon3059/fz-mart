import { notFound } from "next/navigation";
import { getCategoryById, listAllCategories } from "@/server/categories/admin";
import CategoryForm from "../../CategoryForm";

export const metadata = { title: "Edit Category — FZ-Mart Admin" };

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [category, allCategories] = await Promise.all([
    getCategoryById(Number(id)),
    listAllCategories(),
  ]);
  if (!category) notFound();

  return <CategoryForm category={category} allCategories={allCategories} />;
}
