"use client";

/**
 * "How is this sold?" — three cards replacing the old Single price / Variants
 * toggle. Nobody adding a charger thinks "simple pricing mode"; they think
 * "it's one thing". The choice drives the shape of the Options step below it.
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
  /** Set when the category suggests a type the admin hasn't overridden. */
  suggestion,
}: {
  value: SellingType;
  onChange: (next: SellingType) => void;
  suggestion?: { type: SellingType; reason: string } | null;
}) {
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
      {suggestion && suggestion.type !== value && (
        <p className="mt-2 text-[12px] text-stone-400">
          {suggestion.reason}{" "}
          <button
            type="button"
            onClick={() => onChange(suggestion.type)}
            className="font-semibold text-brand-600 hover:underline"
          >
            Use it
          </button>
        </p>
      )}
    </div>
  );
}
