"use client";

import { CATEGORY_ICONS, CATEGORY_ICON_LABELS, CategoryIcon } from "@/lib/category-icons";

/**
 * Grid of selectable category icons. Fully controlled — the parent owns the key
 * and renders it into a hidden input for the server action. Clicking the
 * selected icon again clears it, so an icon can be removed without a separate
 * button.
 */
export default function CategoryIconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div>
      <div className="grid max-h-[168px] grid-cols-6 gap-1.5 overflow-y-auto rounded-xl border border-stone-200 bg-stone-50/60 p-2">
        {Object.keys(CATEGORY_ICONS).map((key) => {
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              title={CATEGORY_ICON_LABELS[key] ?? key}
              onClick={() => onChange(selected ? "" : key)}
              className={[
                "flex aspect-square items-center justify-center rounded-lg border transition",
                selected
                  ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-100"
                  : "border-stone-200 bg-white text-stone-500 hover:border-brand-300 hover:text-brand-600",
              ].join(" ")}
            >
              <CategoryIcon name={key} size={20} />
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[12.5px] text-stone-400">
        {value
          ? `Icon: ${CATEGORY_ICON_LABELS[value] ?? value} — click again to clear.`
          : "Pick an icon, or upload a picture above (a picture always wins)."}
      </p>
    </div>
  );
}
