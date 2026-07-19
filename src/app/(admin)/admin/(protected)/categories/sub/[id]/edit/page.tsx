import { notFound } from "next/navigation";
import { getSubcategoryById, getCategoryById } from "@/server/categories/admin";
import SubcategoryForm from "../../../SubcategoryForm";

export const metadata = { title: "Edit Subcategory — FZ-Mart Admin" };

export default async function EditSubcategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const subcategory = await getSubcategoryById(Number(id));
  if (!subcategory) notFound();
  const category = await getCategoryById(subcategory.categoryId);

  return <SubcategoryForm subcategory={subcategory} categoryName={category?.name ?? ""} />;
}
