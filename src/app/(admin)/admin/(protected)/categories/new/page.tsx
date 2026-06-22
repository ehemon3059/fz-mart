import CategoryForm from "../CategoryForm";

export default function NewCategoryPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">New Category</h1>
      <CategoryForm />
    </div>
  );
}
