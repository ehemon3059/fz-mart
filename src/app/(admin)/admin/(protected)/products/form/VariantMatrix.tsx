"use client";

/**
 * The colour × size grid — price and stock for every combination in one place.
 *
 * A cell exists only when its combination is sellable: switching one off
 * deletes that row rather than saving a zero-stock placeholder, so "this colour
 * doesn't come in 52" is expressed as absence, exactly as the storefront reads
 * it. Cells whose price differs from the bulk value are marked, so an admin can
 * see at a glance what deviates from "everything is ৳2,490".
 */

import { Icon } from "@/components/icons";
import { indexRows, rowKey } from "./variant-utils";
import type { ColorRow, VariantRow } from "./types";

interface Props {
  colors: ColorRow[];
  sizes: string[];
  rows: VariantRow[];
  /** The bulk price (taka) cells are compared against; "" = no bulk price set. */
  bulkPrice: string;
  onChangeCell: (color: string, size: string, patch: Partial<VariantRow>) => void;
  onToggleCell: (color: string, size: string) => void;
}

export default function VariantMatrix({
  colors,
  sizes,
  rows,
  bulkPrice,
  onChangeCell,
  onToggleCell,
}: Props) {
  const byKey = indexRows(rows);
  // A one-axis product still renders as a grid, with a single unnamed column
  // or row — same component, three shapes.
  const cols = sizes.length ? sizes : [""];
  const lines = colors.length ? colors : [null];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-0 text-left">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-2 pb-2 text-[11.5px] font-semibold uppercase tracking-wide text-stone-400">
              {colors.length ? "Colour" : "Option"}
            </th>
            {cols.map((s) => (
              <th
                key={s || "_"}
                className="px-1.5 pb-2 text-center text-[12px] font-bold text-stone-600"
              >
                {s || "—"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((c, li) => (
            <tr key={c?.name ?? li} className="align-top">
              <th
                scope="row"
                className="sticky left-0 z-10 border-t border-stone-100 bg-white py-2 pr-2 text-left"
              >
                <span className="flex items-center gap-1.5">
                  {c?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.imageUrl}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded border border-stone-200 object-cover"
                    />
                  ) : c ? (
                    // No photo yet. A neutral placeholder, not the stored hex —
                    // the swatch colour is no longer editable, so painting the
                    // row with it would just show stale (usually black) data.
                    <span className="h-7 w-7 shrink-0 rounded border border-dashed border-stone-300 bg-stone-100" />
                  ) : null}
                  <span className="truncate text-[13px] font-semibold text-stone-700">
                    {c?.name || (colors.length ? "Unnamed" : "All")}
                  </span>
                </span>
              </th>

              {cols.map((s) => {
                const row = byKey.get(rowKey(c?.name ?? "", s));
                const overridden =
                  !!row && !!bulkPrice.trim() && row.price.trim() !== "" && row.price.trim() !== bulkPrice.trim();
                return (
                  <td key={s || "_"} className="border-t border-stone-100 px-1 py-2">
                    {row ? (
                      <div
                        className={[
                          "relative rounded-lg border p-1",
                          overridden ? "border-brand-300 bg-brand-50/40" : "border-stone-200 bg-white",
                        ].join(" ")}
                      >
                        <button
                          type="button"
                          onClick={() => onToggleCell(c?.name ?? "", s)}
                          title="Not sold in this combination"
                          aria-label={`Remove ${[c?.name, s].filter(Boolean).join(" / ") || "this option"}`}
                          className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded text-stone-300 transition hover:bg-red-50 hover:text-red-500"
                        >
                          <Icon name="x" size={10} />
                        </button>
                        <label className="flex items-center gap-1">
                          <span className="text-[11px] font-semibold text-stone-400">৳</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={row.price}
                            onChange={(e) => onChangeCell(c?.name ?? "", s, { price: e.target.value })}
                            placeholder="0"
                            aria-label={`Price for ${[c?.name, s].filter(Boolean).join(" / ") || "this option"}`}
                            className="w-full min-w-0 bg-transparent py-0.5 text-[12.5px] font-semibold text-stone-800 outline-none"
                          />
                        </label>
                        <label className="mt-0.5 flex items-center gap-1 border-t border-stone-100 pt-0.5">
                          <Icon name="box" size={10} className="shrink-0 text-stone-300" />
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={row.stock}
                            onChange={(e) => onChangeCell(c?.name ?? "", s, { stock: e.target.value })}
                            placeholder="0"
                            aria-label={`Stock for ${[c?.name, s].filter(Boolean).join(" / ") || "this option"}`}
                            className="w-full min-w-0 bg-transparent py-0.5 text-[12px] text-stone-600 outline-none"
                          />
                        </label>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onToggleCell(c?.name ?? "", s)}
                        title="Add this combination"
                        className="flex h-[52px] w-full items-center justify-center rounded-lg border border-dashed border-stone-200 text-stone-300 transition hover:border-brand-300 hover:text-brand-500"
                      >
                        <Icon name="plus" size={13} />
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
