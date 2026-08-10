import { notFound } from "next/navigation";
import { getCategoryById, listAllCategories } from "@/server/categories/admin";
import { listActiveSizeGuides } from "@/server/size-guides";
import CategoryForm from "../../CategoryForm";

export const metadata = { title: "Edit Category — FZ-Mart Admin" };

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [category, allCategories, sizeGuides] = await Promise.all([
    getCategoryById(Number(id)),
    listAllCategories(),
    listActiveSizeGuides(),
  ]);
  if (!category) notFound();

  return (
    <CategoryForm
      category={category}
      allCategories={allCategories}
      sizeGuides={sizeGuides.map((g) => ({
        id: g.id,
        name: g.name,
        sizeLabel: g.sizeLabel,
        values: g.values.map((v) => v.value),
      }))}
    />
  );
}
