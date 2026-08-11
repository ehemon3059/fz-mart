"use client";

/**
 * "How is this sold?" — three cards replacing the old Single price / Variants
 * toggle. Nobody adding a charger thinks "simple pricing mode"; they think
 * "it's one thing". The choice drives the shape of the Options step below it.
 *
 * On a NEW product the category answers this (Category.defaultSellingType,
 * inherited up the tree), so the picker opens LOCKED on the resolved type. The
 * lock is a speed bump, not a wall: reaching for another card asks once and
 * then unlocks, because a category is right about most of its products but
 * never all of them — a ring in a "Colours" Jewelry still needs sizes.
 */

import { Icon, type IconName } from "@/components/icons";
import type { SellingType } from "./types";

const CARDS: { key: SellingType; icon: IconName; title: string; blurb: string; examples: string }[] = [
  {
    key: "single",
    icon: "box",
    title: "Single item",
    blurb: "One price, one stock, gallery photos.",
    examples: "charger · toy · grocery",
  },
  {
    key: "colors",
    icon: "image",
    title: "Colours",
    blurb: "Same item in several colours, one photo each.",
    examples: "bag · watch · eyewear",
  },
  {
    key: "sizes",
    icon: "specGrid",
    title: "Sizes (+ colours)",
    blurb: "Sizes, crossed with colours when it has both.",
    examples: "dress · panjabi · shoes",
  },
];

export default function SellingTypePicker({
  value,
  onChange,
  /** The category set this type and it hasn't been overridden yet. */
  locked = false,
  /** Category whose choice is being shown, for the "Set by …" line. */
  lockedBy,
  /** Asked to switch while locked — confirm, then unlock and apply. */
  onRequestChange,
  /** Set when the chosen type disagrees with what the category expects. */
  deviationNote,
}: {
  value: SellingType;
  onChange: (next: SellingType) => void;
  locked?: boolean;
  lockedBy?: string | null;
  onRequestChange?: (next: SellingType) => void;
  deviationNote?: string | null;
}) {
  const current = CARDS.find((c) => c.key === value) ?? CARDS[0];

  // Locked means step 1's radios already asked this question and the category
  // agreed, so re-drawing three cards here would just ask it twice. Collapse to
  // a confirmation line; "Change" expands the cards by unlocking.
  if (locked) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-stone-200 bg-stone-50/60 p-3.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Icon name={current.icon} size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-bold text-stone-800">{current.title}</span>
          <span className="block text-[12px] leading-snug text-stone-500">
            {current.blurb}
            {lockedBy && <> · set by <span className="font-semibold text-stone-600">{lockedBy}</span></>}
          </span>
        </span>
        <button
          type="button"
          onClick={() => onRequestChange?.(value)}
          className="shrink-0 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-stone-600 transition hover:border-brand-300 hover:text-brand-600"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {CARDS.map((c) => {
          const active = value === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onChange(c.key)}
              aria-pressed={active}
              className={[
                "flex flex-col items-start gap-1 rounded-xl border p-3.5 text-left transition",
                active
                  ? "border-brand-500 bg-brand-50/40 shadow-sm ring-1 ring-brand-500"
                  : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/60",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  active ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-500",
                ].join(" ")}
              >
                <Icon name={c.icon} size={16} />
              </span>
              <span className="mt-1 text-[13.5px] font-bold text-stone-800">{c.title}</span>
              <span className="text-[12px] leading-snug text-stone-500">{c.blurb}</span>
              <span className="text-[11.5px] text-stone-400">{c.examples}</span>
            </button>
          );
        })}
      </div>
      {deviationNote && (
        <p className="mt-2 flex items-start gap-1.5 text-[12px] font-medium text-amber-600">
          <Icon name="warn" size={13} className="mt-px shrink-0" />
          {deviationNote}
        </p>
      )}
    </div>
  );
}
