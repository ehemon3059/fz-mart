"use client";

import { useState, useTransition } from "react";
import { saveBanner } from "./actions";

interface Props {
  banner?: {
    id: number;
    imageUrl: string;
    link: string | null;
    sortOrder: number;
    isActive: boolean;
  };
}

export default function BannerForm({ banner }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await saveBanner(banner?.id ?? null, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1">Image URL</label>
        <input
          name="imageUrl"
          required
          defaultValue={banner?.imageUrl ?? "/placeholder.svg"}
          className="w-full border rounded px-3 py-2"
        />
        <p className="text-xs text-gray-500 mt-1">
          Use a path under /public (e.g. /placeholder.svg) until an upload flow exists.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Link (optional)</label>
        <input
          name="link"
          defaultValue={banner?.link ?? ""}
          placeholder="/category/electronics"
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Sort Order</label>
        <input
          name="sortOrder"
          type="number"
          defaultValue={banner?.sortOrder ?? 0}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input name="isActive" type="checkbox" defaultChecked={banner?.isActive ?? true} />
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
