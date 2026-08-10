"use client";

/**
 * The size chips for this product — pre-loaded from the resolved size guide and
 * toggled on/off, with room for one-off custom sizes.
 *
 * Order comes from the guide, never from the order rows happen to be in, which
 * is what stops a product shipping with chips reading "XL, S, M, L".
 */

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";

interface Props {
  /** Sizes offered by the resolved guide, in the guide's order. */
  guideValues: string[];
  guideName: string | null;
  /** Sizes currently switched on, in display order. */
  selected: string[];
  onChange: (next: string[]) => void;
}

const splitSizes = (raw: string) =>
  raw
    .split(/[,\n\t]+/)
    .map((s) => s.trim())
    .filter(Boolean);

export default function SizePicker({ guideValues, guideName, selected, onChange }: Props) {
  const [draft, setDraft] = useState("");

  // Guide sizes first (in guide order), then anything custom the admin added.
  const custom = selected.filter((s) => !guideValues.includes(s));
  const isOn = (s: string) => selected.includes(s);
  const allGuideSizesOn = guideValues.length > 0 && guideValues.every((s) => selected.includes(s));

  const toggle = (size: string) => {
    if (isOn(size)) {
      onChange(selected.filter((s) => s !== size));
      return;
    }
    // Re-sort against the guide so switching one back on puts it in its place
    // rather than at the end.
    const next = [...selected, size];
    const rank = (s: string) => {
      const i = guideValues.indexOf(s);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    onChange(next.sort((a, b) => rank(a) - rank(b)));
  };

  const addCustom = () => {
    const added = splitSizes(draft).filter((s) => !selected.includes(s));
    if (added.length) onChange([...selected, ...added]);
    setDraft("");
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-stone-400">
          Sizes{selected.length > 0 && ` · ${selected.length} on`}
        </span>
        <span className="text-[11.5px] text-stone-400">
          {guideName ? (
            <>
              from <span className="font-semibold text-stone-500">{guideName}</span>
            </>
          ) : (
            <>
              no size guide —{" "}
              <Link href="/admin/size-guides/new" className="font-semibold text-brand-600 hover:underline">
                create one
              </Link>{" "}
              or type sizes below
            </>
          )}
        </span>
      </div>

      {guideValues.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {guideValues.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              aria-pressed={isOn(s)}
              className={[
                "min-w-[2.75rem] rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition",
                isOn(s)
                  ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500"
                  : "border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:text-stone-700",
              ].join(" ")}
            >
              {s}
            </button>
          ))}
          {/* Counts only the GUIDE's sizes: comparing against selected.length
              would mislabel itself the moment a custom size is added, and
              clearing would take those customs — and their priced rows — with
              it. All/None touches the guide chips and nothing else. */}
          <button
            type="button"
            onClick={() =>
              onChange(
                allGuideSizesOn
                  ? selected.filter((s) => !guideValues.includes(s))
                  : [...guideValues, ...custom],
              )
            }
            className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
          >
            {allGuideSizesOn ? "None" : "All"}
          </button>
        </div>
      )}

      {custom.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {custom.map((s) => (
            <span
              key={s}
              className="flex items-center gap-1 rounded-lg border border-brand-300 bg-brand-50/60 py-1 pl-2.5 pr-1 text-[13px] font-semibold text-brand-700"
            >
              {s}
              <button
                type="button"
                onClick={() => onChange(selected.filter((x) => x !== s))}
                aria-label={`Remove ${s}`}
                className="flex h-5 w-5 items-center justify-center rounded text-brand-400 transition hover:bg-white hover:text-red-500"
              >
                <Icon name="x" size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add a one-off size — e.g. Free Size"
          className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-[13px] text-stone-800 outline-none focus:border-brand-500 placeholder:text-stone-400"
        />
        <button
          type="button"
          onClick={addCustom}
          className="shrink-0 rounded-lg border border-stone-200 bg-white px-3 py-2 text-[12.5px] font-semibold text-stone-600 transition hover:bg-stone-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}
