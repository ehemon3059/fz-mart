"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import ImageCustomizer from "@/components/admin/ImageCustomizer";

/* Category/subcategory hero images are square 800×800 thumbnails, kept light so
   the storefront category pages stay fast. One image; the customizer crops any
   upload to a square and shrinks it under the size cap. */
const CATEGORY_IMG = { width: 800, height: 800, maxBytes: 150 * 1024 };

/**
 * A single-image picker that reuses the product ImageCustomizer + the shared
 * /api/admin/upload endpoint. Shows the current image with a Replace/Remove
 * overlay, or an "Add image" dropzone when empty. Fully controlled — the parent
 * owns the URL and renders it into a hidden input for the server action.
 */
export default function CategoryImagePicker({
  value,
  onChange,
  label = "Image",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const [customizing, setCustomizing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCustomized(file: File) {
    setCustomizing(false);
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "categories");
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        {value ? (
          <div className="group relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/55 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
              <button
                type="button"
                onClick={() => setCustomizing(true)}
                className="rounded-md bg-white/90 px-1.5 py-1 text-[10.5px] font-semibold text-stone-700 hover:bg-white"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                title="Remove image"
                className="flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-stone-500 hover:bg-white hover:text-red-500"
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCustomizing(true)}
            disabled={uploading}
            className="flex h-28 w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-stone-300 bg-stone-50/60 text-stone-500 transition hover:border-brand-300 hover:bg-brand-50/30 hover:text-brand-600 disabled:opacity-50"
          >
            {uploading ? (
              <span className="text-[12px] font-semibold">Uploading…</span>
            ) : (
              <>
                <Icon name="plus" size={20} />
                <span className="text-[12px] font-semibold">Add image</span>
              </>
            )}
          </button>
        )}

        <p className="pt-1 text-[12.5px] text-stone-400">
          {label} — square, 800×800px, ≤150 KB. Upload any picture, then crop &amp; shrink it to fit.
        </p>
      </div>

      {error && (
        <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] text-red-600">
          <Icon name="warn" size={13} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      {customizing && (
        <ImageCustomizer
          label={label}
          targetWidth={CATEGORY_IMG.width}
          targetHeight={CATEGORY_IMG.height}
          maxBytes={CATEGORY_IMG.maxBytes}
          onClose={() => setCustomizing(false)}
          onDone={handleCustomized}
        />
      )}
    </div>
  );
}
