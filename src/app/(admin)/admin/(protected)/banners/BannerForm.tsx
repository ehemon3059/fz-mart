"use client";

import { useMemo, useState, useTransition } from "react";
import {
  BANNER_SLOTS,
  getBannerSlotSpec,
  validateBannerImage,
  type BannerSlot,
} from "@/lib/banner-slots";
import ImageCustomizer from "@/components/admin/ImageCustomizer";
import { saveBanner } from "./actions";

interface Props {
  banner?: {
    id: number;
    imageUrl: string;
    link: string | null;
    slot: BannerSlot;
    sortOrder: number;
    isActive: boolean;
  };
}

const PLACEHOLDER = "/placeholder.svg";

/** Load an image source and resolve its natural pixel dimensions. */
function readImageSize(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not read that image file."));
    img.src = src;
  });
}

export default function BannerForm({ banner }: Props) {
  const [slot, setSlot] = useState<BannerSlot>(banner?.slot ?? "MAIN");
  const [imageUrl, setImageUrl] = useState(banner?.imageUrl ?? PLACEHOLDER);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [pending, startTransition] = useTransition();

  const spec = useMemo(() => getBannerSlotSpec(slot), [slot]);
  const hasImage = imageUrl !== PLACEHOLDER;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    // 1) Validate dimensions + weight BEFORE uploading — a wrong image never
    //    reaches the server or the homepage.
    const objectUrl = URL.createObjectURL(file);
    let size: { w: number; h: number };
    try {
      size = await readImageSize(objectUrl);
    } catch {
      URL.revokeObjectURL(objectUrl);
      setError("Could not read that image file.");
      return;
    }
    URL.revokeObjectURL(objectUrl);

    const problem = validateBannerImage(slot, size.w, size.h, file.size);
    if (problem) {
      setError(problem);
      e.target.value = ""; // let them pick again
      return;
    }

    // 2) Passed checks — upload.
    await uploadFile(file);
  }

  async function uploadFile(file: File) {
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

  // The customizer returns an image already cropped to this slot's exact size
  // and compressed under its weight cap, so it just needs uploading.
  async function handleCustomized(file: File) {
    setCustomizing(false);
    setError(null);
    await uploadFile(file);
  }

  // Switching the target card invalidates an image sized for a different card —
  // re-check the current image against the newly chosen slot.
  async function handleSlotChange(next: BannerSlot) {
    setSlot(next);
    setError(null);
    if (imageUrl === PLACEHOLDER) return;
    try {
      const size = await readImageSize(imageUrl);
      const problem = validateBannerImage(next, size.w, size.h, 0);
      if (problem) setError(`${problem} Please re-upload an image for this card.`);
    } catch {
      /* existing remote image we can't measure — leave as-is */
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
    <>
    <form action={handleSubmit} className="max-w-md space-y-5">
      {/* Which card */}
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">Hero card</label>
        <select
          value={slot}
          onChange={(e) => handleSlotChange(e.target.value as BannerSlot)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        >
          {BANNER_SLOTS.map((s) => (
            <option key={s.slot} value={s.slot}>
              {s.label}
              {s.multiple ? " — multiple card section" : ""}
            </option>
          ))}
        </select>
        <input type="hidden" name="slot" value={slot} />

        {/* Requirements for the chosen slot */}
        <div className="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-[12.5px] leading-relaxed text-stone-600">
          <p>{spec.description}</p>
          <ul className="mt-1.5 space-y-0.5">
            <li>
              • Required size: <b>{spec.recommendedWidth}×{spec.recommendedHeight}px</b> ({spec.ratioW}:{spec.ratioH})
            </li>
            <li>• Max file weight: <b>{Math.round(spec.maxBytes / 1024)} KB</b></li>
            {spec.multiple && (
              <li>• Add several to this card — they rotate as a carousel with left/right arrows.</li>
            )}
          </ul>
          <button
            type="button"
            onClick={() => setCustomizing(true)}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-[12.5px] font-semibold text-stone-700 hover:border-stone-400"
          >
            ✂ Customize image — crop &amp; resize to fit
          </button>
        </div>
      </div>

      {/* Image */}
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">Banner image</label>
        {hasImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="mb-2 h-32 w-full rounded border object-cover" />
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="w-full rounded border px-3 py-2 text-sm"
        />
        {uploading && <p className="mt-1 text-xs text-stone-500">Uploading…</p>}
        <input type="hidden" name="imageUrl" value={imageUrl} required />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">Link (optional)</label>
        <input
          name="link"
          defaultValue={banner?.link ?? ""}
          placeholder="/category/electronics"
          className="w-full rounded border px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">
          Sort order {spec.multiple && <span className="text-stone-400">(carousel order)</span>}
        </label>
        <input
          name="sortOrder"
          type="number"
          defaultValue={banner?.sortOrder ?? 0}
          className="w-full rounded border px-3 py-2"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input name="isActive" type="checkbox" defaultChecked={banner?.isActive ?? true} />
        Active
      </label>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || uploading || !hasImage}
        className="rounded bg-black px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>

    {customizing && (
      <ImageCustomizer
        label={spec.label}
        targetWidth={spec.recommendedWidth}
        targetHeight={spec.recommendedHeight}
        maxBytes={spec.maxBytes}
        onClose={() => setCustomizing(false)}
        onDone={handleCustomized}
      />
    )}
    </>
  );
}
