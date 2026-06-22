"use client";

import { useState, useTransition } from "react";
import { savePage } from "./actions";

interface Props {
  slug: string;
  page?: { title: string; content: string } | null;
  fallbackTitle: string;
}

export default function PageForm({ slug, page, fallbackTitle }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await savePage(slug, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4 max-w-2xl">
      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          name="title"
          required
          defaultValue={page?.title ?? fallbackTitle}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Content</label>
        <textarea
          name="content"
          required
          rows={14}
          defaultValue={page?.content}
          className="w-full border rounded px-3 py-2"
        />
      </div>
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
