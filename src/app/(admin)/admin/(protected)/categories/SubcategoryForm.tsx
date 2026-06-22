"use client";

import { useState, useTransition } from "react";
import { saveSubcategory } from "./actions";

export default function SubcategoryForm({ categoryId }: { categoryId: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await saveSubcategory(null, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setName("");
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex items-center gap-2 pt-1">
      <input type="hidden" name="categoryId" value={categoryId} />
      <input type="hidden" name="isActive" value="on" />
      <input
        name="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New subcategory name"
        className="border rounded px-2 py-1 text-sm flex-1"
      />
      <button
        type="submit"
        disabled={pending}
        className="text-sm underline disabled:opacity-50"
      >
        {pending ? "Adding..." : "Add"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
