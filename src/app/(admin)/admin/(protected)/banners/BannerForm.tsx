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
  const [imageUrl, setImageUrl] = useState(banner?.imageUrl ?? "/placeholder.svg");
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setImageUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

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
        <label className="block text-sm font-medium mb-1">Banner Image</label>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="w-full h-32 object-cover rounded border mb-2" />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full border rounded px-3 py-2 text-sm"
        />
        {uploading && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
        <input type="hidden" name="imageUrl" value={imageUrl} required />
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
        disabled={pending || uploading}
        className="bg-black text-white px-4 py-2 rounded font-medium disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
