"use client";

import { useState, useTransition } from "react";
import ImageCustomizer from "@/components/admin/ImageCustomizer";
import {
  LOGO_DISPLAY_WIDTH,
  LOGO_DISPLAY_HEIGHT,
  LOGO_MAX_DISPLAY_WIDTH,
  LOGO_SOURCE_WIDTH,
  LOGO_SOURCE_HEIGHT,
  LOGO_MIN_LONG_EDGE,
  LOGO_MAX_BYTES,
  validateLogoImage,
} from "@/lib/logo-spec";
import { saveLogo } from "./actions";

/** Load an image source and resolve its natural pixel dimensions. */
function readImageSize(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not read that image file."));
    img.src = src;
  });
}

export default function LogoForm({ initialLogoUrl }: { initialLogoUrl: string | null }) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [pending, startTransition] = useTransition();

  const hasLogo = logoUrl.trim() !== "";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSaved(false);

    // Validate the raw file's dimensions + weight BEFORE uploading. A wrong
    // size is rejected here with a nudge toward the cropper.
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

    const problem = validateLogoImage(size.w, size.h, file.size);
    if (problem) {
      setError(problem);
      e.target.value = ""; // let them pick again
      return;
    }

    await uploadFile(file);
  }

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "branding");
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setLogoUrl(data.url);
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // The customizer hands back a high-res PNG cropped to the source size
  // (LOGO_SOURCE_WIDTH×LOGO_SOURCE_HEIGHT) and under the weight cap, so it just
  // needs uploading.
  async function handleCustomized(file: File) {
    setCustomizing(false);
    setError(null);
    await uploadFile(file);
  }

  function persist(url: string) {
    setError(null);
    startTransition(async () => {
      const result = await saveLogo(url);
      if (result?.error) {
        setError(result.error);
        setSaved(false);
      } else {
        setSaved(true);
      }
    });
  }

  function handleSave() {
    persist(logoUrl);
  }

  function handleRemove() {
    setLogoUrl("");
    persist("");
  }

  return (
    <>
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-[17px] font-bold text-stone-900">Store logo</h2>
        <p className="mt-1 text-[13.5px] text-stone-500">
          Shown in the storefront header. Upload a logo at least{" "}
          <b>
            {LOGO_SOURCE_WIDTH}×{LOGO_SOURCE_HEIGHT}px
          </b>{" "}
          (min {LOGO_MIN_LONG_EDGE}px on the long side, max{" "}
          {Math.round(LOGO_MAX_BYTES / 1024)} KB). PNG or WebP with a transparent background works
          best. It’s displayed at {LOGO_DISPLAY_WIDTH}×{LOGO_DISPLAY_HEIGHT} and scaled down so it
          stays sharp on every screen. Leave empty to use the default text logo.
        </p>

        {/* Preview */}
        <div className="mt-4">
          <span className="mb-1.5 block text-[13px] font-semibold text-stone-700">Preview</span>
          <div className="inline-flex items-center rounded-lg border border-stone-200 bg-stone-50 p-3">
            {hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Store logo"
                width={LOGO_DISPLAY_WIDTH}
                height={LOGO_DISPLAY_HEIGHT}
                style={{
                  height: LOGO_DISPLAY_HEIGHT,
                  width: "auto",
                  maxWidth: LOGO_MAX_DISPLAY_WIDTH,
                  objectFit: "contain",
                }}
              />
            ) : (
              <span className="text-[13px] italic text-stone-400">
                No logo — the default “FZ Mart” wordmark is used.
              </span>
            )}
          </div>
        </div>

        {/* Upload + crop */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-[13px] font-semibold text-stone-700 hover:border-stone-400">
            Upload logo
            <input
              type="file"
              accept="image/png,image/webp,image/jpeg"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={() => setCustomizing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-[13px] font-semibold text-stone-700 hover:border-stone-400"
          >
            ✂ Customize image — crop &amp; resize to fit
          </button>
          {hasLogo && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={pending || uploading}
              className="text-[13px] font-semibold text-red-600 hover:underline disabled:opacity-50"
            >
              Remove logo
            </button>
          )}
        </div>
        {uploading && <p className="mt-2 text-[12.5px] text-stone-500">Uploading…</p>}

        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-600">
            {error}
          </p>
        )}
        {saved && !error && (
          <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-[13px] font-medium text-green-700">
            Logo saved — it now appears across the storefront.
          </p>
        )}

        <div className="mt-5">
          <button
            type="button"
            onClick={handleSave}
            disabled={pending || uploading}
            className="rounded-lg bg-stone-900 px-5 py-2 text-[14px] font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save logo"}
          </button>
        </div>
      </div>

      {customizing && (
        <ImageCustomizer
          label="Store logo"
          targetWidth={LOGO_SOURCE_WIDTH}
          targetHeight={LOGO_SOURCE_HEIGHT}
          maxBytes={LOGO_MAX_BYTES}
          format="png"
          onClose={() => setCustomizing(false)}
          onDone={handleCustomized}
        />
      )}
    </>
  );
}
