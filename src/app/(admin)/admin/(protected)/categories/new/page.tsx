import CategoryForm from "../CategoryForm";
import { listAllCategories } from "@/server/categories/admin";
import { listActiveSizeGuides } from "@/server/size-guides";

export const metadata = { title: "New Category — FZ-Mart Admin" };

export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ parent?: string }>;
}) {
  const [{ parent }, allCategories, sizeGuides] = await Promise.all([
    searchParams,
    listAllCategories(),
    listActiveSizeGuides(),
  ]);
  const defaultParentId = parent ? Number(parent) : null;

  return (
    <CategoryForm
      allCategories={allCategories}
      sizeGuides={sizeGuides.map((g) => ({
        id: g.id,
        name: g.name,
        sizeLabel: g.sizeLabel,
        values: g.values.map((v) => v.value),
      }))}
      defaultParentId={Number.isFinite(defaultParentId) ? defaultParentId : null}
    />
  );
}
