"use client";

import { useState, useTransition } from "react";
import { saveCategory } from "./actions";

interface Props {
  category?: { id: number; name: string; sortOrder: number; isActive: boolean };
}

export default function CategoryForm({ category }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await saveCategory(category?.id ?? null, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          name="name"
          required
          defaultValue={category?.name}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Sort Order</label>
        <input
          name="sortOrder"
          type="number"
          defaultValue={category?.sortOrder ?? 0}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          name="isActive"
          type="checkbox"
          defaultChecked={category?.isActive ?? true}
        />
        Active
      </label>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-black text-white px-4 py-2 rounded font-medium disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
