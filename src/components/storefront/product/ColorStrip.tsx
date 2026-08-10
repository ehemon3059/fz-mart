"use client";

/**
 * "More Colors" — the colourway picker as a strip of real product shots rather
 * than colour chips. A saree or a bag is bought on the photo, so hovering one
 * swaps the main gallery image straight away (a preview, undone on mouse-out)
 * and clicking commits the choice.
 *
 * Shown only when every colour has a photo; otherwise the buy box keeps its hex
 * chips, so products photographed the old way look exactly as they did.
 *
 * Touch devices never fire hover, so a tap is simply a click — the same commit
 * path, no separate handling.
 */

import { useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useVariantImage } from "./VariantImageContext";

export interface ColorStripOption {
  name: string;
  /** Product shot for this colourway. Guaranteed non-empty by the caller. */
  imageUrl: string;
  soldOut: boolean;
}

interface Props {
  options: ColorStripOption[];
  /** Currently chosen colour name, or null before a choice is made. */
  selected: string | null;
  onSelect: (name: string) => void;
}

/** Arrows only earn their space once the strip can actually overflow. */
const SCROLLS_FROM = 7;

export default function ColorStrip({ options, selected, onSelect }: Props) {
  const { setPreview } = useVariantImage();
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: -1 | 1) => trackRef.current?.scrollBy({ left: dir * 240, behavior: "smooth" });
  const scrollable = options.length >= SCROLLS_FROM;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-700">
          More Colors
          {selected && <span className="ml-1.5 font-semibold text-gray-900">· {selected}</span>}
        </p>
        {scrollable && (
          <span className="hidden shrink-0 items-center gap-1 sm:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Scroll colours left"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 hover:text-gray-800"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Scroll colours right"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 hover:text-gray-800"
            >
              <ChevronRight size={15} />
            </button>
          </span>
        )}
      </div>

      <div
        ref={trackRef}
        // The strip scrolls itself instead of the page; scrollbar-hidden keeps
        // the track clean on desktop while staying swipeable on touch.
        className="scrollbar-hidden -mx-1 flex gap-2 overflow-x-auto scroll-smooth px-1 pb-1"
        // Leaving the whole strip clears any preview, including when the cursor
        // exits sideways between two tiles.
        onMouseLeave={() => setPreview(null)}
      >
        {options.map((c) => {
          const isSelected = c.name === selected;
          return (
            <button
              key={c.name}
              type="button"
              disabled={c.soldOut}
              title={c.name + (c.soldOut ? " — sold out" : "")}
              aria-label={c.name}
              aria-pressed={isSelected}
              onClick={() => onSelect(c.name)}
              onMouseEnter={() => !c.soldOut && setPreview(c.imageUrl)}
              // Keyboard users get the same preview when tabbing through.
              onFocus={() => !c.soldOut && setPreview(c.imageUrl)}
              onBlur={() => setPreview(null)}
              className={[
                "relative w-[72px] shrink-0 overflow-hidden rounded-lg border bg-white transition sm:w-[84px]",
                c.soldOut ? "cursor-not-allowed opacity-40" : "hover:border-gray-400",
                isSelected ? "border-brand-600 ring-1 ring-brand-600" : "border-gray-200",
              ].join(" ")}
            >
              {/* Selected marker sits on top of the photo, as in the reference:
                  a solid bar rather than a border tint, which a busy product
                  shot would swallow. */}
              {isSelected && <span className="absolute inset-x-0 top-0 z-10 h-[3px] bg-brand-600" />}
              <span className="relative block aspect-[3/4]">
                <Image
                  src={c.imageUrl}
                  alt={c.name}
                  fill
                  sizes="84px"
                  className="object-cover"
                  draggable={false}
                />
              </span>
              {c.soldOut && (
                <span className="absolute inset-0 grid place-items-center bg-white/60 text-[10px] font-bold uppercase tracking-wide text-gray-700">
                  Sold out
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
