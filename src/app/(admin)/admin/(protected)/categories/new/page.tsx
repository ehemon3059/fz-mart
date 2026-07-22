import CategoryForm from "../CategoryForm";
import { listAllCategories } from "@/server/categories/admin";

export const metadata = { title: "New Category — FZ-Mart Admin" };

export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ parent?: string }>;
}) {
  const [{ parent }, allCategories] = await Promise.all([searchParams, listAllCategories()]);
  const defaultParentId = parent ? Number(parent) : null;

  return (
    <CategoryForm
      allCategories={allCategories}
      defaultParentId={Number.isFinite(defaultParentId) ? defaultParentId : null}
    />
  );
}
