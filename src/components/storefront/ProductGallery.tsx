"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/icons";

interface GalleryImage {
  id: number;
  url: string;
  isPrimary?: boolean;
}

interface Props {
  images: GalleryImage[];
  name: string;
  promoBadge?: string | null;
}

const PLACEHOLDER = "/placeholder.svg";

export default function ProductGallery({ images, name, promoBadge }: Props) {
  const safeImages: GalleryImage[] = images.length ? images : [{ id: 0, url: PLACEHOLDER }];
  const primaryIdx = safeImages.findIndex((i) => i.isPrimary);
  const [active, setActive] = useState(primaryIdx >= 0 ? primaryIdx : 0);
  const [lightbox, setLightbox] = useState(false);

  const activeUrl = safeImages[active]?.url ?? PLACEHOLDER;

  // Hover magnifier lens — a round circle that follows the cursor over the main
  // image and shows a zoomed-in crop of the exact spot under it (desktop only).
  const LENS_SIZE = 180; // diameter of the circular lens, px
  const ZOOM = 2.4; // magnification factor
  const mainRef = useRef<HTMLDivElement>(null);
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null);

  const onLensMove = (e: React.MouseEvent) => {
    const rect = mainRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      setLens(null);
      return;
    }
    setLens({ x, y });
  };

  // Casual-download deterrents: block the right-click "Save image as…" menu and
  // native drag-to-save. (Not absolute — screenshots / DevTools still work.)
  const blockContextMenu = (e: React.MouseEvent) => e.preventDefault();

  const go = (i: number) => setActive((i + safeImages.length) % safeImages.length);
  const hasMany = safeImages.length > 1;

  return (
    <div className="space-y-3 select-none [-webkit-user-drag:none]" onContextMenu={blockContextMenu}>
      {/* Main image — click to open full screen, arrows to flip photos */}
      <div
        ref={mainRef}
        role="button"
        tabIndex={0}
        onClick={() => setLightbox(true)}
        onMouseMove={onLensMove}
        onMouseLeave={() => setLens(null)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setLightbox(true);
          } else if (e.key === "ArrowRight") go(active + 1);
          else if (e.key === "ArrowLeft") go(active - 1);
        }}
        className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-lg bg-gray-100"
        style={lens ? { cursor: "none" } : undefined}
        aria-label="View image full screen"
      >
        <Image
          key={activeUrl}
          src={activeUrl}
          alt={name}
          fill
          sizes="(max-width:768px) 100vw, 600px"
          className="object-cover animate-fz-fade-img"
          draggable={false}
          priority
        />

        {/* Magnifier lens — circular zoom that tracks the cursor (desktop) */}
        {lens && (
          <div
            className="pointer-events-none absolute z-20 hidden rounded-full border-2 border-white shadow-[0_4px_20px_rgba(0,0,0,0.35)] ring-1 ring-black/10 md:block"
            style={{
              width: LENS_SIZE,
              height: LENS_SIZE,
              left: lens.x - LENS_SIZE / 2,
              top: lens.y - LENS_SIZE / 2,
              backgroundImage: `url(${activeUrl})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${(mainRef.current?.clientWidth ?? 0) * ZOOM}px ${
                (mainRef.current?.clientHeight ?? 0) * ZOOM
              }px`,
              backgroundPosition: `${LENS_SIZE / 2 - lens.x * ZOOM}px ${
                LENS_SIZE / 2 - lens.y * ZOOM
              }px`,
            }}
          />
        )}

        {/* "click to view" hint under the lens circle */}
        {lens && (
          <span
            className="pointer-events-none absolute z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white md:block"
            style={{ left: lens.x, top: lens.y + LENS_SIZE / 2 + 8 }}
          >
            click to view
          </span>
        )}

        {promoBadge && (
          <span className="absolute left-3 top-3 rounded bg-red-600 px-2 py-1 text-xs text-white">{promoBadge}</span>
        )}

        {hasMany && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(active - 1);
              }}
              aria-label="Previous image"
              className="absolute left-2.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-gray-700 shadow-md ring-1 ring-black/5 transition hover:bg-white hover:text-gray-900 md:opacity-0 md:group-hover:opacity-100"
            >
              <Icon name="arrowLeft" size={19} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(active + 1);
              }}
              aria-label="Next image"
              className="absolute right-2.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-gray-700 shadow-md ring-1 ring-black/5 transition hover:bg-white hover:text-gray-900 md:opacity-0 md:group-hover:opacity-100"
            >
              <Icon name="arrowRight" size={19} />
            </button>
          </>
        )}

        <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100">
          <Icon name="search" size={13} /> Click to zoom
        </span>
      </div>

      {/* Thumbnails — click to swap the main image */}
      {safeImages.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {safeImages.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(idx)}
              className={[
                "relative aspect-square overflow-hidden rounded-md bg-gray-100 transition",
                idx === active
                  ? "ring-2 ring-brand-600 ring-offset-1"
                  : "opacity-80 ring-1 ring-transparent hover:opacity-100 hover:ring-gray-300",
              ].join(" ")}
              aria-label={`Show image ${idx + 1}`}
            >
              <Image src={img.url} alt="" fill sizes="120px" className="object-cover" draggable={false} />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <Lightbox images={safeImages} index={active} setIndex={setActive} name={name} onClose={() => setLightbox(false)} />
      )}
    </div>
  );
}

/* ─────────── full-screen zoom + pan viewer ─────────── */
function Lightbox({
  images,
  index,
  setIndex,
  name,
  onClose,
}: {
  images: GalleryImage[];
  index: number;
  setIndex: (i: number) => void;
  name: string;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const last = useRef({ x: 0, y: 0 });

  const reset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };
  const zoomIn = () => setScale((s) => Math.min(4, +(s + 0.5).toFixed(2)));
  const zoomOut = () =>
    setScale((s) => {
      const next = Math.max(1, +(s - 0.5).toFixed(2));
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });

  const go = (i: number) => {
    setIndex((i + images.length) % images.length);
    reset();
  };

  // Keyboard: Esc closes, +/- zoom, arrows switch images.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") zoomIn();
      else if (e.key === "-") zoomOut();
      else if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, images.length]);

  // Drag-to-pan, only meaningful once zoomed in.
  function onPointerDown(e: React.PointerEvent) {
    if (scale <= 1) return;
    setDragging(true);
    last.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
  }
  function onPointerUp() {
    setDragging(false);
  }

  const url = images[index]?.url ?? PLACEHOLDER;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/90" onMouseDown={onClose}>
      {/* toolbar */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span className="text-[13px] text-white/70">
          {index + 1} / {images.length}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={zoomOut}
            disabled={scale <= 1}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30"
            aria-label="Zoom out"
          >
            <Icon name="minus" size={18} />
          </button>
          <span className="w-12 text-center text-[13px] tabular-nums">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={scale >= 4}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30"
            aria-label="Zoom in"
          >
            <Icon name="plus" size={18} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
            aria-label="Close"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
      </div>

      {/* image stage */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Previous image"
          >
            <Icon name="arrowLeft" size={20} />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={name}
          draggable={false}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onDoubleClick={() => (scale > 1 ? reset() : setScale(2))}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: dragging ? "none" : "transform .15s ease",
            cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in",
            maxHeight: "82vh",
            maxWidth: "92vw",
          }}
          className="select-none object-contain"
        />

        {images.length > 1 && (
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Next image"
          >
            <Icon name="arrowRight" size={20} />
          </button>
        )}
      </div>

      <p className="pb-4 text-center text-[12px] text-white/50" onMouseDown={(e) => e.stopPropagation()}>
        Scroll or use +/− to zoom · drag to move · double-click to reset
      </p>
    </div>
  );
}
