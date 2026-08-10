"use client";

/**
 * The product's colours — photo, name, and a hex fallback, authored ONCE and
 * stamped onto every generated row of that colour. Without this a 7-colour ×
 * 14-size saree would mean uploading the same photo 98 times.
 *
 * The photo is the real chooser on the storefront ("More Colors" is a strip of
 * product shots), so it leads the row; the hex sits behind an "advanced"
 * disclosure because it only matters for colours with no photo.
 */

import { useState } from "react";
import { Icon } from "@/components/icons";
import type { ColorRow } from "./types";

interface Props {
  colors: ColorRow[];
  /** True while colour `idx` has a photo upload in flight. */
  isBusy: (idx: number) => boolean;
  onChange: (idx: number, patch: Partial<ColorRow>) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
  onPickPhoto: (idx: number) => void;
}

export default function ColorList({
  colors,
  isBusy,
  onChange,
  onAdd,
  onRemove,
  onMove,
  onPickPhoto,
}: Props) {
  const [showHex, setShowHex] = useState(false);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-stone-400">
          Colours{colors.length > 0 && ` · ${colors.length}`}
        </span>
        {colors.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHex((v) => !v)}
            className="text-[11.5px] font-semibold text-stone-400 underline decoration-dotted hover:text-stone-600"
          >
            {showHex ? "Hide" : "Show"} swatch colours
          </button>
        )}
      </div>

      <div className="space-y-2">
        {colors.map((c, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50/60 p-2"
          >
            {/* photo — the thumbnail doubles as the replace button */}
            <button
              type="button"
              onClick={() => onPickPhoto(idx)}
              disabled={isBusy(idx)}
              title={c.imageUrl ? "Replace photo" : "Add photo"}
              className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-stone-200 bg-white text-stone-400 transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-50"
            >
              {isBusy(idx) ? (
                <span className="text-[10px] font-semibold">…</span>
              ) : c.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Icon name="image" size={17} />
              )}
            </button>

            <div className="min-w-0 flex-1">
              <input
                value={c.name}
                onChange={(e) => onChange(idx, { name: e.target.value })}
                placeholder="Colour name — e.g. Purple"
                className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-2 text-[13.5px] text-stone-800 outline-none focus:border-brand-500"
              />
              {showHex && (
                <label className="mt-1.5 flex items-center gap-2 text-[11.5px] text-stone-500">
                  <input
                    type="color"
                    value={c.hexCode || "#000000"}
                    onChange={(e) => onChange(idx, { hexCode: e.target.value })}
                    className="h-6 w-8 cursor-pointer rounded border border-stone-200 bg-white p-0.5"
                  />
                  Fallback chip — only used when this colour has no photo
                </label>
              )}
              {!c.imageUrl && !showHex && (
                <p className="mt-1 text-[11.5px] text-stone-400">No photo — shoppers see a colour chip instead.</p>
              )}
            </div>

            <div className="flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => onMove(idx, -1)}
                disabled={idx === 0}
                aria-label="Move colour up"
                className="flex h-7 w-6 items-center justify-center rounded-md text-stone-400 transition hover:bg-white hover:text-stone-700 disabled:opacity-25"
              >
                <Icon name="chevronDown" size={14} className="rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => onMove(idx, 1)}
                disabled={idx === colors.length - 1}
                aria-label="Move colour down"
                className="flex h-7 w-6 items-center justify-center rounded-md text-stone-400 transition hover:bg-white hover:text-stone-700 disabled:opacity-25"
              >
                <Icon name="chevronDown" size={14} />
              </button>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                aria-label="Remove colour"
                className="flex h-7 w-7 items-center justify-center rounded-md text-stone-400 transition hover:bg-red-50 hover:text-red-500"
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-300 bg-stone-50/60 py-2 text-[13px] font-semibold text-stone-500 transition hover:border-brand-300 hover:bg-brand-50/30 hover:text-brand-600"
      >
        <Icon name="plus" size={15} /> Add colour
      </button>
    </div>
  );
}
