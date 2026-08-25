"use client";

/**
 * Options & pricing — the step that replaces the old "Sizes / Variants" card.
 *
 * Colours and sizes are authored as LISTS; the sellable rows are derived from
 * them, so a 7-colour × 14-size saree is two lists and a bulk price rather than
 * 98 hand-entered rows. Every list change re-syncs the matrix through
 * `generateRows`, which preserves the price, stock and SKU already entered for
 * a combination and drops only what the admin removed.
 *
 * Two views over the same rows: the matrix for bulk work, the list for the
 * detail a grid cell can't hold (discount, per-row photo, price colour, stock
 * visibility). The list is the default on narrow screens.
 */

import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import ColorList from "./ColorList";
import SizePicker from "./SizePicker";
import VariantMatrix from "./VariantMatrix";
import VariantRows from "./VariantRows";
import { ErrorText } from "./atoms";
import { blankRow, fillSkus, generateRows, indexRows, rowKey, summarise } from "./variant-utils";
import type { ColorRow, SellingType, VariantRow } from "./types";

interface Props {
  sellingType: Exclude<SellingType, "single">;
  colors: ColorRow[];
  rows: VariantRow[];
  baseSku: string;
  /**
   * Row keys whose stock is owned by the ledger — every option that already
   * existed when this form loaded. Their level changes through a purchase-order
   * receipt or an audited adjustment, never by re-saving this form, so their
   * stock is shown rather than typed. An option added since load is absent from
   * this set and still takes an opening figure.
   */
  lockedStockKeys: Set<string>;
  /** Sizes offered by the resolved size guide, in the guide's order. */
  guideValues: string[];
  guideName: string | null;
  error?: string;
  imageError?: string | null;
  isColorBusy: (idx: number) => boolean;
  isRowBusy: (idx: number) => boolean;
  onPickColorPhoto: (idx: number) => void;
  onPickRowPhoto: (idx: number) => void;
  onColorsChange: (next: ColorRow[]) => void;
  onRowsChange: (next: VariantRow[]) => void;
  onBaseSkuChange: (next: string) => void;
}

const takaFmt = (taka: number) => "৳" + taka.toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function OptionsBuilder({
  sellingType,
  colors,
  rows,
  baseSku,
  lockedStockKeys,
  guideValues,
  guideName,
  error,
  imageError,
  isColorBusy,
  isRowBusy,
  onPickColorPhoto,
  onPickRowPhoto,
  onColorsChange,
  onRowsChange,
  onBaseSkuChange,
}: Props) {
  const [view, setView] = useState<"matrix" | "list">("matrix");
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");

  const withSizes = sellingType === "sizes";

  /** Sizes currently in play, in guide order first, then any custom ones. */
  const sizes = useMemo(() => {
    const present = [...new Set(rows.map((r) => r.size).filter(Boolean))];
    const ranked = guideValues.filter((v) => present.includes(v));
    return [...ranked, ...present.filter((s) => !guideValues.includes(s))];
  }, [rows, guideValues]);

  /** Colours that can produce rows — an unnamed one is still being typed. */
  const namedColors = useMemo(() => colors.filter((c) => c.name.trim()), [colors]);

  /** Rebuild the matrix from the current lists, keeping what's already entered. */
  const sync = (nextColors: ColorRow[], nextSizes: string[], base = rows) =>
    onRowsChange(
      generateRows({
        colors: nextColors.filter((c) => c.name.trim()),
        sizes: withSizes ? nextSizes : [],
        existing: base,
        baseSku,
      }),
    );

  /* ── colours ── */
  const setColor = (idx: number, patch: Partial<ColorRow>) => {
    const before = colors[idx];
    const next = colors.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    onColorsChange(next);
    // A rename must MOVE the rows, not orphan them: regenerating on a changed
    // name would drop the old rows and hand back blanks.
    if (patch.name !== undefined && before.name !== patch.name) {
      const renamed = rows.map((r) => (r.color === before.name ? { ...r, color: patch.name! } : r));
      sync(next, sizes, renamed);
      return;
    }
    if (patch.hexCode !== undefined || patch.imageUrl !== undefined) sync(next, sizes);
  };

  const addColor = () => onColorsChange([...colors, { name: "", hexCode: "#000000", imageUrl: "" }]);

  const removeColor = (idx: number) => {
    const gone = colors[idx].name.trim();
    const next = colors.filter((_, i) => i !== idx);
    onColorsChange(next);
    // An unnamed colour owns no rows. Filtering on "" would match every
    // size-only row instead and wipe a sized product's whole matrix.
    sync(next, sizes, gone ? rows.filter((r) => r.color !== gone) : rows);
  };

  const moveColor = (idx: number, dir: -1 | 1) => {
    const to = idx + dir;
    if (to < 0 || to >= colors.length) return;
    const next = [...colors];
    [next[idx], next[to]] = [next[to], next[idx]];
    onColorsChange(next);
    sync(next, sizes);
  };

  /* ── sizes ── */
  const setSizes = (next: string[]) => sync(colors, next);

  /* ── cells ── */
  const changeCell = (color: string, size: string, patch: Partial<VariantRow>) =>
    onRowsChange(rows.map((r) => (rowKey(r.color, r.size) === rowKey(color, size) ? { ...r, ...patch } : r)));

  const toggleCell = (color: string, size: string) => {
    const key = rowKey(color, size);
    if (indexRows(rows).has(key)) {
      onRowsChange(rows.filter((r) => rowKey(r.color, r.size) !== key));
      return;
    }
    const c = colors.find((x) => x.name === color) ?? null;
    const fresh = blankRow(c, size);
    if (baseSku.trim()) onRowsChange(fillSkus([...rows, fresh], baseSku));
    else onRowsChange([...rows, fresh]);
  };

  /* ── bulk ── */
  // A locked row's stock is a fact about the warehouse, not a form value, so no
  // bulk control may touch it. Everything below therefore edits price freely
  // and stock only where the option doesn't exist in the ledger yet.
  const canSetStock = (r: VariantRow) => !lockedStockKeys.has(rowKey(r.color, r.size));

  const applyBulk = () => {
    const price = bulkPrice.trim();
    const stock = bulkStock.trim();
    if (!price && !stock) return;
    onRowsChange(
      rows.map((r) => ({
        ...r,
        price: price ? price : r.price,
        stock: stock && canSetStock(r) ? stock : r.stock,
      })),
    );
  };
  /** Only fill the gaps — leaves every deliberate override alone. */
  const fillEmpty = () => {
    const price = bulkPrice.trim();
    const stock = bulkStock.trim();
    onRowsChange(
      rows.map((r) => ({
        ...r,
        price: !r.price.trim() && price ? price : r.price,
        // A typed 0 means "sold out", not "not filled in yet" — only a blank
        // is a gap. New rows start blank, so generating then filling works.
        stock: !r.stock.trim() && stock && canSetStock(r) ? stock : r.stock,
      })),
    );
  };

  /** Are there any rows whose opening stock can still be typed? */
  const anyOpenStock = rows.some(canSetStock);

  const summary = summarise(rows);

  return (
    <div className="space-y-5">
      {imageError && <ErrorText>{imageError}</ErrorText>}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">{error}</p>
      )}

      {/* ── the two lists ── */}
      <div className={withSizes ? "grid gap-5 lg:grid-cols-2" : ""}>
        <ColorList
          colors={colors}
          isBusy={isColorBusy}
          onChange={setColor}
          onAdd={addColor}
          onRemove={removeColor}
          onMove={moveColor}
          onPickPhoto={onPickColorPhoto}
        />
        {withSizes && (
          <SizePicker guideValues={guideValues} guideName={guideName} selected={sizes} onChange={setSizes} />
        )}
      </div>

      {/* ── bulk bar ── */}
      <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
        <div className="flex flex-wrap items-end gap-2.5">
          <label className="min-w-0">
            <span className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wide text-stone-400">
              Price for all
            </span>
            <span className="flex items-center overflow-hidden rounded-lg border border-stone-200 bg-white">
              <span className="border-r border-stone-200 bg-stone-50 px-2 py-1.5 text-[12.5px] font-semibold text-stone-500">
                ৳
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
                placeholder="0"
                className="w-24 bg-transparent px-2 py-1.5 text-[13px] text-stone-800 outline-none"
              />
            </span>
          </label>
          {anyOpenStock && (
            <label className="min-w-0">
              <span className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wide text-stone-400">
                Opening stock
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={bulkStock}
                onChange={(e) => setBulkStock(e.target.value)}
                placeholder="0"
                title="Only applies to options that aren't in the stock ledger yet"
                className="w-20 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-[13px] text-stone-800 outline-none focus:border-brand-500"
              />
            </label>
          )}
          <button
            type="button"
            onClick={fillEmpty}
            disabled={rows.length === 0}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-40"
          >
            Fill blanks
          </button>
          <button
            type="button"
            onClick={applyBulk}
            disabled={rows.length === 0}
            className="rounded-lg bg-stone-800 px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-stone-900 disabled:opacity-40"
          >
            Overwrite all
          </button>

          <span className="ml-auto flex items-end gap-2">
            <label className="min-w-0">
              <span className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wide text-stone-400">
                SKU root
              </span>
              <input
                value={baseSku}
                onChange={(e) => onBaseSkuChange(e.target.value.toUpperCase())}
                placeholder="e.g. SAR"
                className="w-28 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-[13px] uppercase text-stone-800 outline-none focus:border-brand-500 placeholder:normal-case placeholder:text-stone-400"
              />
            </label>
            <button
              type="button"
              onClick={() => onRowsChange(fillSkus(rows, baseSku))}
              disabled={!baseSku.trim() || rows.length === 0}
              title="Fill in any option that has no SKU yet"
              className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-40"
            >
              Fill SKUs
            </button>
          </span>
        </div>
        <p className="mt-2 text-[11.5px] text-stone-400">
          “Fill blanks” only touches options you haven&apos;t priced yet. SKUs are built as{" "}
          <span className="font-semibold text-stone-500">ROOT-COLOUR-SIZE</span> and never rewritten once set, so
          re-saving a product can&apos;t renumber your inventory.{" "}
          {anyOpenStock ? (
            <>Opening stock applies only to options that aren&apos;t in the stock ledger yet.</>
          ) : (
            <>
              Stock isn&apos;t edited here — receive a purchase order, or use the Stock panel to correct a count.
            </>
          )}
        </p>
      </div>

      {/* ── the rows ── */}
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/60 px-4 py-8 text-center text-[13px] text-stone-400">
          {namedColors.length === 0 && sizes.length === 0
            ? withSizes
              ? "Add a colour or switch on some sizes — the options appear here."
              : "Add a colour — one option per colour appears here."
            : "No options yet."}
        </p>
      ) : (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-stone-400">
              Options · {summary.count}
            </span>
            <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-0.5">
              {(["matrix", "list"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={[
                    "rounded-md px-2.5 py-1 text-[12px] font-semibold capitalize transition",
                    view === v ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700",
                  ].join(" ")}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Matrix is bulk work; below lg the grid can't breathe, so the list
              (which stacks) is what shows there. */}
          <div className={view === "matrix" ? "hidden lg:block" : "hidden"}>
            <VariantMatrix
              colors={namedColors}
              sizes={withSizes ? sizes : []}
              rows={rows}
              bulkPrice={bulkPrice}
              lockedStockKeys={lockedStockKeys}
              onChangeCell={changeCell}
              onToggleCell={toggleCell}
            />
          </div>
          <div className={view === "matrix" ? "lg:hidden" : ""}>
            <VariantRows
              variants={rows}
              productPriceColor=""
              imageError={null}
              showErrors={false}
              isBusy={isRowBusy}
              lockedStockKeys={lockedStockKeys}
              onChange={(idx, patch) => onRowsChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)))}
              onAdd={() => onRowsChange([...rows, blankRow(null, "")])}
              onRemove={(idx) => onRowsChange(rows.filter((_, i) => i !== idx))}
              onPickPhoto={onPickRowPhoto}
            />
          </div>

          {/* ── summary ── */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[12.5px]">
            <span className="font-semibold text-stone-700">
              {summary.count} option{summary.count === 1 ? "" : "s"}
            </span>
            <span className="text-stone-500">
              {summary.fromPrice != null ? `from ${takaFmt(summary.fromPrice)}` : "no price yet"}
            </span>
            <span className="text-stone-500">{summary.totalStock} in stock</span>
            {summary.missingPrice > 0 && (
              <span className="font-semibold text-red-600">{summary.missingPrice} missing a price</span>
            )}
            {summary.badDiscount > 0 && (
              <span className="font-semibold text-amber-600">{summary.badDiscount} with a bad discount</span>
            )}
            {summary.duplicateSkus.length > 0 && (
              <span className="font-semibold text-red-600">duplicate SKU: {summary.duplicateSkus.join(", ")}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
