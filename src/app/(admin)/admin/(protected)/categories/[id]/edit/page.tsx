import { notFound } from "next/navigation";
import { getCategoryById } from "@/server/categories/admin";
import CategoryForm from "../../CategoryForm";

export const metadata = { title: "Edit Category — FZ-Mart Admin" };

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await getCategoryById(Number(id));
  if (!category) notFound();

  return <CategoryForm category={category} />;
}
