"use client";

/**
 * Photo upload for the product form — one flow, two places.
 *
 * Every picture (gallery cover shots and per-variant option photos alike) goes
 * through the same crop-and-compress modal and the same /api/admin/upload call,
 * so the pieces live together here:
 *
 *   useImageUpload  owns the modal + upload lifecycle and reports the finished
 *                   URL back through `onUploaded`. The form stays the single
 *                   owner of where that URL lands in state.
 *   GalleryGrid     the product-photo grid (cover selection, remove, add tile).
 *   VariantPhotoField  the one-photo control on a variant row.
 */

import { useState } from "react";
import { Icon } from "@/components/icons";
import ImageCustomizer from "@/components/admin/ImageCustomizer";
import { ErrorText, Label } from "./atoms";
import { sameTarget } from "./helpers";
import { MAX_IMAGES, PRODUCT_IMG, type ImageRow, type UploadTarget } from "./types";

export function useImageUpload(onUploaded: (target: UploadTarget, url: string) => void) {
  // What the image customizer is uploading for: the product gallery or one
  // variant row. Null = closed.
  const [customizing, setCustomizing] = useState<UploadTarget | null>(null);
  // Which target is mid-upload, so only that tile shows a spinner.
  const [uploading, setUploading] = useState<UploadTarget | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The customizer hands back a JPEG already cropped to 1000×1000 and compressed
  // under 200 KB, so it just needs uploading and storing against its target.
  async function handleCustomized(file: File) {
    const target = customizing;
    if (target === null) return;
    setCustomizing(null);
    setError(null);
    setUploading(target);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "products");
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onUploaded(target, data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  return {
    /** Open the crop modal for a target. */
    openFor: setCustomizing,
    /** The target currently mid-upload, or null. */
    uploading,
    /** Last upload failure, or null. */
    error,
    /** True while `target` is uploading — drives that tile's spinner. */
    isBusy: (target: UploadTarget) => sameTarget(uploading, target),
    /** Render this once, anywhere: the modal itself.
     *  Explicit null check — variant row 0 is a valid target but falsy. */
    customizer:
      customizing !== null ? (
        <ImageCustomizer
          label={
            customizing.kind === "product"
              ? "Product photo"
              : customizing.kind === "color"
                ? "Colour photo"
                : "Variant photo"
          }
          targetWidth={PRODUCT_IMG.width}
          targetHeight={PRODUCT_IMG.height}
          maxBytes={PRODUCT_IMG.maxBytes}
          onClose={() => setCustomizing(null)}
          onDone={handleCustomized}
        />
      ) : null,
  };
}

/* ─────────── product gallery ─────────── */
export function GalleryGrid({
  images,
  busy,
  error,
  onPick,
  onRemove,
  onMakePrimary,
}: {
  images: ImageRow[];
  /** True while a gallery upload is in flight. */
  busy: boolean;
  error?: string | null;
  onPick: () => void;
  onRemove: (idx: number) => void;
  onMakePrimary: (idx: number) => void;
}) {
  return (
    <>
      <Label hint={`up to ${MAX_IMAGES}`}>Product photos</Label>
      <p className="-mt-1 mb-2.5 text-[12px] text-stone-400">
        Shown on the product page and in listings. Square 1000×1000px · ≤200 KB each. The first photo is the cover.
      </p>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 2xl:grid-cols-6">
        {images.map((img, idx) => (
          <div
            key={img.url + idx}
            className="group relative aspect-square overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" className="h-full w-full object-cover" />
            {idx === 0 && (
              <span className="absolute left-1 top-1 rounded bg-brand-600 px-1.5 py-0.5 text-[9.5px] font-bold text-white shadow">
                Cover
              </span>
            )}
            {/* Always-visible controls: hover reveals nothing on touch,
                so these stay on-screen at all sizes. */}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-1">
              {idx !== 0 ? (
                <button
                  type="button"
                  onClick={() => onMakePrimary(idx)}
                  title="Make cover"
                  className="rounded bg-white/90 px-1.5 py-1 text-[10px] font-semibold leading-none text-stone-700 active:bg-white"
                >
                  Cover
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => onRemove(idx)}
                title="Remove photo"
                aria-label="Remove photo"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-white/90 text-stone-500 active:bg-white active:text-red-500"
              >
                <Icon name="trash" size={13} />
              </button>
            </div>
          </div>
        ))}

        {images.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={onPick}
            disabled={busy}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-stone-300 bg-stone-50/60 text-stone-500 transition hover:border-brand-300 hover:bg-brand-50/30 hover:text-brand-600 disabled:opacity-50"
          >
            {busy ? (
              <span className="text-[11px] font-semibold">Uploading…</span>
            ) : (
              <>
                <Icon name="plus" size={18} />
                <span className="text-[11px] font-semibold">Add photo</span>
              </>
            )}
          </button>
        )}
      </div>
      <p className="mt-2 text-[12px] text-stone-400">
        {images.length}/{MAX_IMAGES} photos · upload any picture, then crop it square.
      </p>
      <ErrorText>{error ?? undefined}</ErrorText>
    </>
  );
}

/* ─────────── one photo on a variant row ─────────── */
export function VariantPhotoField({
  imageUrl,
  busy,
  onPick,
  onClear,
}: {
  imageUrl: string;
  busy: boolean;
  onPick: () => void;
  onClear: () => void;
}) {
  // Thumbnail doubles as the replace button so the control stays thumb-sized
  // on mobile.
  return (
    <div className="mt-2 flex items-center gap-2.5 px-0.5">
      {imageUrl ? (
        <>
          <button
            type="button"
            onClick={onPick}
            disabled={busy}
            title="Replace photo"
            className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-stone-200 bg-stone-100 disabled:opacity-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          </button>
          <span className="min-w-0 flex-1 text-[12px] text-stone-500">
            {busy ? "Uploading…" : "Photo for this option"}
          </span>
          <button
            type="button"
            onClick={onClear}
            aria-label="Remove variant photo"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-stone-400 transition hover:bg-red-50 hover:text-red-500"
          >
            <Icon name="trash" size={14} />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onPick}
          disabled={busy}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-stone-300 bg-white py-2 text-[12.5px] font-semibold text-stone-500 transition hover:border-brand-300 hover:bg-brand-50/30 hover:text-brand-600 disabled:opacity-50"
        >
          {busy ? (
            "Uploading…"
          ) : (
            <>
              <Icon name="image" size={14} /> Add photo for this option
            </>
          )}
        </button>
      )}
    </div>
  );
}
