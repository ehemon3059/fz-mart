"use client";

import { useEffect, useRef, useState } from "react";
import Cropper from "cropperjs";
import "cropperjs/dist/cropper.css";

// React/TSX port of the Cropper.js canvas editor. Lets an admin crop ANY image
// to a card's exact dimensions and dial down quality to meet its size cap, then
// hands back a ready-to-upload JPEG File.

interface Props {
  targetWidth: number;
  targetHeight: number;
  maxBytes: number;
  /** Friendly name of the card being customised, for the header. */
  label: string;
  onClose: () => void;
  onDone: (file: File) => void;
}

const REDUCTIONS = [
  { label: "None", quality: 1 },
  { label: "10%", quality: 0.9 },
  { label: "20%", quality: 0.8 },
  { label: "30%", quality: 0.7 },
];

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", quality));
}

export default function ImageCustomizer({
  targetWidth,
  targetHeight,
  maxBytes,
  label,
  onClose,
  onDone,
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const cropperRef = useRef<Cropper | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [quality, setQuality] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // (Re)build the cropper whenever a new image is chosen.
  useEffect(() => {
    if (!src || !imgRef.current) return;
    const cropper = new Cropper(imgRef.current, {
      viewMode: 1,
      dragMode: "move",
      background: false,
      aspectRatio: targetWidth / targetHeight,
      autoCropArea: 1,
      movable: true,
      zoomable: true,
      rotatable: false,
      scalable: false,
      cropBoxResizable: true,
      cropBoxMovable: true,
      ready() {
        setZoom(1);
      },
    });
    cropperRef.current = cropper;
    return () => {
      cropper.destroy();
      cropperRef.current = null;
    };
  }, [src, targetWidth, targetHeight]);

  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleZoom(value: number) {
    setZoom(value);
    cropperRef.current?.zoomTo(value);
  }

  async function apply() {
    const cropper = cropperRef.current;
    if (!cropper) return;
    setBusy(true);
    setError(null);

    // Grab the cropped region at full resolution...
    const source = cropper.getCroppedCanvas({
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });
    if (!source) {
      setError("Could not read the crop area. Please try again.");
      setBusy(false);
      return;
    }

    // ...then paint it onto a canvas sized EXACTLY to this card so the output is
    // guaranteed to be e.g. 1200×900 — not whatever size Cropper.js hands back.
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Could not process the image in this browser.");
      setBusy(false);
      return;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

    // Export at the chosen quality, then keep stepping down until it fits the
    // card's weight cap (so a customised image always passes the size limit).
    let q = quality;
    let blob = await canvasToBlob(canvas, q);
    while (blob && blob.size > maxBytes && q > 0.4) {
      q = Math.round((q - 0.1) * 10) / 10;
      blob = await canvasToBlob(canvas, q);
    }

    if (!blob) {
      setError("Could not process the image. Please try another.");
      setBusy(false);
      return;
    }
    if (blob.size > maxBytes) {
      setError(
        `Still ${Math.round(blob.size / 1024)} KB after compression (limit ${Math.round(
          maxBytes / 1024,
        )} KB). Pick a higher reduction or a simpler image.`,
      );
      setBusy(false);
      return;
    }

    const file = new File([blob], `banner-${Date.now()}.jpg`, { type: "image/jpeg" });
    onDone(file);
    setBusy(false);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3">
          <div>
            <h2 className="text-[15px] font-bold text-stone-900">Customize image</h2>
            <p className="text-[12.5px] text-stone-500">
              {label} · crops to {targetWidth}×{targetHeight}px · ≤{Math.round(maxBytes / 1024)} KB
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {!src ? (
            <label className="flex h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 text-center text-stone-500 hover:border-stone-400">
              <span className="text-[14px] font-semibold">Choose an image to crop</span>
              <span className="mt-1 text-[12.5px]">Any size — you’ll crop it to fit this card</span>
              <input type="file" accept="image/*" onChange={pickFile} className="hidden" />
            </label>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl bg-stone-900/5" style={{ maxHeight: "52vh" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img ref={imgRef} src={src} alt="" style={{ maxWidth: "100%", display: "block" }} />
              </div>

              {/* zoom */}
              <div className="mt-4">
                <label className="mb-1 block text-[13px] font-semibold text-stone-700">Zoom</label>
                <input
                  type="range"
                  min={0.1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => handleZoom(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* quality reduction */}
              <div className="mt-4">
                <p className="text-[13px] font-semibold text-stone-700">Reduce file size</p>
                <p className="text-[12px] text-stone-500">
                  Lower quality = smaller file. We’ll auto-reduce further if needed to fit the limit.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {REDUCTIONS.map((r) => (
                    <label
                      key={r.label}
                      className={`cursor-pointer rounded-full border px-3 py-1 text-[13px] font-medium ${
                        quality === r.quality
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-stone-300 text-stone-600 hover:border-stone-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reduction"
                        className="hidden"
                        checked={quality === r.quality}
                        onChange={() => setQuality(r.quality)}
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-600">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-3 border-t border-stone-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-[14px] font-semibold text-stone-600 hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!src || busy}
            className="rounded-lg bg-stone-900 px-5 py-2 text-[14px] font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {busy ? "Processing…" : "Use this image"}
          </button>
        </div>
      </div>
    </div>
  );
}
