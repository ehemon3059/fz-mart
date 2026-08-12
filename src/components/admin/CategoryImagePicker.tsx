"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icons";
import ImageCustomizer from "@/components/admin/ImageCustomizer";
import { isSvgUrl as isSvg } from "@/lib/image-kind";

/* Category/subcategory hero images are square 800×800 thumbnails, kept light so
   the storefront category pages stay fast. One image; the customizer crops any
   upload to a square and shrinks it under the size cap. */
const CATEGORY_IMG = { width: 800, height: 800, maxBytes: 150 * 1024 };

/* SVG skips the customizer entirely. Cropping runs the artwork through a canvas,
   which rasterizes it — the exact quality loss the vector avoids. A square-ish
   illustration already fits the tile, so it is uploaded as-is (sanitized server
   side) and CSS handles the fit. Kept well under the server's 512 KB cap. */
const MAX_SVG_BYTES = 512 * 1024;

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
  const svgInputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
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

  function handleCustomized(file: File) {
    setCustomizing(false);
    void upload(file);
  }

  function handleSvgPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Let the same file be re-picked after an error.
    e.target.value = "";
    if (!file) return;
    if (file.type !== "image/svg+xml" && !file.name.toLowerCase().endsWith(".svg")) {
      setError("That is not an SVG file. Use “Add image” for photos.");
      return;
    }
    if (file.size > MAX_SVG_BYTES) {
      setError(`SVG too large — ${Math.round(file.size / 1024)} KB (limit 512 KB).`);
      return;
    }
    void upload(file);
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        {value ? (
          <div className="group relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
            {/* Vectors are drawn to fit so the whole illustration stays visible;
                photos still fill the square. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              className={`h-full w-full ${isSvg(value) ? "bg-white object-contain p-2" : "object-cover"}`}
            />
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

        <div className="pt-1">
          <p className="text-[12.5px] text-stone-400">
            {label} — square, 800×800px, ≤150 KB. Upload any picture, then crop &amp; shrink it to fit.
          </p>
          <p className="mt-1 text-[12.5px] text-stone-400">
            Have an <span className="font-semibold text-stone-500">SVG</span>? Upload it directly —
            it stays sharp at every size and weighs far less. No cropping needed.
          </p>
          <button
            type="button"
            onClick={() => svgInputRef.current?.click()}
            disabled={uploading}
            className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-2.5 py-1 text-[12.5px] font-semibold text-stone-600 transition hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-700 disabled:opacity-50"
          >
            <Icon name="plus" size={13} />
            Upload SVG
          </button>
          <input
            ref={svgInputRef}
            type="file"
            accept=".svg,image/svg+xml"
            onChange={handleSvgPicked}
            className="hidden"
          />
        </div>
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
