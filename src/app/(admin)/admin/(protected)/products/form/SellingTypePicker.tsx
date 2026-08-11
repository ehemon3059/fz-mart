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
  return (
    <div>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {CARDS.map((c) => {
          const active = value === c.key;
          // While locked the other two cards stay clickable but route through
          // the confirm — a disabled card would leave no visible way out.
          const dimmed = locked && !active;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => (dimmed ? onRequestChange?.(c.key) : onChange(c.key))}
              aria-pressed={active}
              className={[
                "flex flex-col items-start gap-1 rounded-xl border p-3.5 text-left transition",
                active
                  ? "border-brand-500 bg-brand-50/40 shadow-sm ring-1 ring-brand-500"
                  : dimmed
                    ? "border-stone-200 bg-stone-50/60 opacity-55 hover:opacity-100"
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
      {locked && (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-stone-400">
          <Icon name="tag" size={12} className="text-stone-300" />
          <span>
            Set by {lockedBy ? <span className="font-semibold text-stone-500">{lockedBy}</span> : "the category"}.
          </span>
          <button
            type="button"
            onClick={() => onRequestChange?.(value)}
            className="font-semibold text-brand-600 hover:underline"
          >
            Change
          </button>
        </p>
      )}
      {!locked && deviationNote && (
        <p className="mt-2 flex items-start gap-1.5 text-[12px] font-medium text-amber-600">
          <Icon name="warn" size={13} className="mt-px shrink-0" />
          {deviationNote}
        </p>
      )}
    </div>
  );
}
