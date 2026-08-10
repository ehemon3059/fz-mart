"use client";

/**
 * The Sizes / Variants editor — one row per option (a colour, a size, or a
 * colour+size combo), each with its own price, discount, stock and photo.
 *
 * Presentation only: rows come in as props and every edit is reported back, so
 * ProductForm stays the single owner of the form state. The card shell around
 * this lives in ProductForm too.
 */

import { Icon } from "@/components/icons";
import { ErrorText } from "./atoms";
import { variantLabelOf } from "./helpers";
import { VariantPhotoField } from "./ImageUploader";
import type { VariantRow } from "./types";

interface Props {
  variants: VariantRow[];
  /** Product-level price colour, used as the fallback swatch on each row. */
  productPriceColor: string;
  /** Validation message for the variant set as a whole. */
  error?: string;
  /** Last photo-upload failure. */
  imageError?: string | null;
  /** Errors belong to variant mode; in simple mode the card is disabled. */
  showErrors: boolean;
  /** True while row `idx` has a photo upload in flight. */
  isBusy: (idx: number) => boolean;
  onChange: (idx: number, patch: Partial<VariantRow>) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onPickPhoto: (idx: number) => void;
}

export default function VariantRows({
  variants,
  productPriceColor,
  error,
  imageError,
  showErrors,
  isBusy,
  onChange,
  onAdd,
  onRemove,
  onPickPhoto,
}: Props) {
  return (
    <>
      {/* Upload failures for the per-row photos surface here: the gallery
          block that used to show them is hidden in variant mode, and a
          silently-failed upload would otherwise look like a no-op. */}
      {showErrors && imageError && (
        <div className="mb-3">
          <ErrorText>{imageError}</ErrorText>
        </div>
      )}
      {error && showErrors && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">{error}</p>
      )}
      {/* Six columns don't fit the admin's left column at mid viewports, and
          the fixed ones win: the flexible Size column used to be squeezed to
          a sliver, hiding a saved size like "2 YRS". Header and rows share
          ONE scroll container so they stay aligned while scrolling, and
          sm:min-w keeps every column at a usable width instead of clipping
          Stock off the edge. */}
      <div className="overflow-x-auto">
        <div className="sm:min-w-[600px]">
          {variants.length > 0 && (
            <div className="mb-2 hidden grid-cols-[140px_1fr_110px_110px_90px_36px] gap-2 px-1 text-[11.5px] font-semibold uppercase tracking-wide text-stone-400 sm:grid">
              <span>Colour</span>
              <span>Size / option</span>
              <span>Price</span>
              <span>Discount</span>
              <span>Stock</span>
              <span />
            </div>
          )}
          <div className="space-y-2">
            {variants.map((v, idx) => {
              const priceNum = Number(v.price);
              const discNum = Number(v.discountPrice);
              const discValid = v.discountPrice.trim() !== "" && discNum > 0 && discNum < priceNum;
              const discInvalid = v.discountPrice.trim() !== "" && !discValid;
              const discPct = discValid ? Math.round((1 - discNum / priceNum) * 100) : 0;
              return (
                <div key={idx} className="rounded-lg border border-stone-200 bg-stone-50/60 p-2">
                  <div className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[140px_1fr_110px_110px_90px_36px]">
                    {/* Colour is optional per row: a swatch colour + name. Only a
                        named colour is saved and matched to its swatch/image. */}
                    <div className="flex min-w-0 items-center overflow-hidden rounded-md border border-stone-200 bg-white">
                      <input
                        type="color"
                        value={v.colorHex || "#000000"}
                        onChange={(e) => onChange(idx, { colorHex: e.target.value })}
                        title="Swatch colour"
                        className="h-8 w-8 shrink-0 cursor-pointer border-r border-stone-200 bg-white p-0.5"
                      />
                      <input
                        value={v.color}
                        onChange={(e) => onChange(idx, { color: e.target.value })}
                        placeholder="Colour"
                        className="w-full min-w-0 bg-transparent px-2 py-2 text-[13.5px] text-stone-800 outline-none placeholder:text-stone-400"
                      />
                    </div>
                    <input
                      value={v.size}
                      onChange={(e) => onChange(idx, { size: e.target.value })}
                      placeholder="e.g. M / 1 Litre"
                      /* min-w-[5rem] on the 1fr column: the five fixed columns beside
                         it can squeeze this one to zero width at mid viewports, which
                         hid the saved size ("2 YRS") behind a sliver of a box. */
                      className="col-span-2 min-w-0 rounded-md border border-stone-200 bg-white px-2.5 py-2 text-[13.5px] text-stone-800 outline-none focus:border-brand-500 sm:col-span-1 sm:min-w-[5rem]"
                    />
                    <div className="flex items-center overflow-hidden rounded-md border border-stone-200 bg-white">
                      <span className="border-r border-stone-200 bg-stone-50 px-2 py-2 text-[13px] font-semibold text-stone-500">
                        ৳
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={v.price}
                        onChange={(e) => onChange(idx, { price: e.target.value })}
                        placeholder="0"
                        className="w-full min-w-0 bg-transparent px-2 py-2 text-[13.5px] text-stone-800 outline-none"
                      />
                    </div>
                    <div
                      className={[
                        "flex items-center overflow-hidden rounded-md border bg-white",
                        discInvalid ? "border-red-300" : "border-stone-200",
                      ].join(" ")}
                    >
                      <span className="border-r border-stone-200 bg-stone-50 px-2 py-2 text-[13px] font-semibold text-stone-500">
                        ৳
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={v.discountPrice}
                        onChange={(e) => onChange(idx, { discountPrice: e.target.value })}
                        placeholder="—"
                        title="Sale price (optional). Leave blank for no discount."
                        className="w-full min-w-0 bg-transparent px-2 py-2 text-[13.5px] text-stone-800 outline-none"
                      />
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={v.stock}
                      onChange={(e) => onChange(idx, { stock: e.target.value })}
                      placeholder="0"
                      className="min-w-0 rounded-md border border-stone-200 bg-white px-2.5 py-2 text-[13.5px] text-stone-800 outline-none focus:border-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => onRemove(idx)}
                      className="flex h-8 w-8 items-center justify-center justify-self-end rounded-md text-stone-400 transition hover:bg-red-50 hover:text-red-500"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>

                  {/* One photo per variant row — shown on the storefront when
                      this option is picked. */}
                  <VariantPhotoField
                    imageUrl={v.imageUrl}
                    busy={isBusy(idx)}
                    onPick={() => onPickPhoto(idx)}
                    onClear={() => onChange(idx, { imageUrl: "" })}
                  />

                  {/* Row footer: discount feedback + storefront stock visibility. */}
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-0.5">
                    <span className="text-[12px]">
                      {discInvalid ? (
                        <span className="font-medium text-red-600">Discount must be below the price.</span>
                      ) : discValid ? (
                        <span className="font-semibold text-brand-600">
                          −{discPct}% off · sells at ৳{discNum}
                        </span>
                      ) : (
                        <span className="text-stone-400">No discount</span>
                      )}
                    </span>
                    <label className="flex items-center gap-1.5 text-[12px] font-medium text-stone-600">
                      SKU
                      <input
                        value={v.sku}
                        onChange={(e) => onChange(idx, { sku: e.target.value.toUpperCase() })}
                        placeholder="—"
                        aria-label={`SKU for ${variantLabelOf(v.color, v.size) || "this variant"}`}
                        className="w-32 rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[11.5px] uppercase text-stone-700 outline-none focus:border-brand-500 placeholder:normal-case placeholder:text-stone-300"
                      />
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-stone-600">
                      <input
                        type="checkbox"
                        checked={v.showStock}
                        onChange={(e) => onChange(idx, { showStock: e.target.checked })}
                        className="h-3.5 w-3.5 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
                      />
                      Show stock count on site
                    </label>
                    {/* Per-variant price colour. Unset = inherit the product's
                        colour (which itself falls back to the default black). */}
                    <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-stone-600">
                      <input
                        type="color"
                        value={v.priceColor || productPriceColor || "#111827"}
                        onChange={(e) => onChange(idx, { priceColor: e.target.value })}
                        aria-label={`Price colour for ${variantLabelOf(v.color, v.size) || "this variant"}`}
                        className="h-6 w-8 cursor-pointer rounded border border-stone-200 bg-white p-0.5"
                      />
                      Price colour
                      {v.priceColor && (
                        <button
                          type="button"
                          onClick={() => onChange(idx, { priceColor: "" })}
                          className="text-[11px] font-medium text-stone-400 underline decoration-dotted hover:text-stone-600"
                        >
                          reset
                        </button>
                      )}
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-300 bg-stone-50/60 py-2.5 text-[13.5px] font-semibold text-stone-500 transition hover:border-brand-300 hover:bg-brand-50/30 hover:text-brand-600"
      >
        <Icon name="plus" size={15} /> Add variant
      </button>
      {variants.length > 0 && (
        <p className="mt-2.5 text-[12px] text-stone-400">
          Set a colour and/or size per row — both are optional, but each row needs at least one plus a price. The lowest
          price becomes the storefront “from” price; each variant’s own price &amp; stock are charged at checkout.
          Out-of-stock variants can’t be added to cart.
        </p>
      )}
    </>
  );
}
