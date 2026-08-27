"use client";

/**
 * Create a product without leaving the purchase order.
 *
 * Captures only what a PO needs to reference: how the product sells, a
 * category, and the options being ordered. No price, no photos, no stock —
 * those belong to finishing the product, and demanding them here is exactly
 * what used to force an admin to invent a price and a stock figure for goods
 * that had not been ordered yet.
 *
 * The shape is chosen FIRST, exactly as on the product form, and the category
 * list below it only ever contains categories that actually sell that way —
 * the flat "every category, indented" dropdown this replaces offered all 34 at
 * once with no clue which sold by size. `CategoryPicker` is the same component
 * the product form uses, so the two forms can never drift apart on which
 * category is a valid target for which shape.
 *
 * The result is a DRAFT, which cannot reach the storefront until someone
 * photographs and prices it.
 */

import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { inheritedGuideId } from "@/lib/size-guide-inheritance";
import type { SellingType } from "@/lib/category-inheritance";
import CategoryPicker from "../../../products/form/CategoryPicker";
import type { GuideOption } from "../../../products/form/SizeGuidePanel";
import type { Category } from "../../../products/form/types";
import { quickCreateProductAction, type QuickProductResult } from "../actions";

export type { GuideOption };
/** The category rows the picker walks — the full tree, not a flattened list. */
export type CategoryOption = Category;

const field =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-accent";
const label = "mb-1 block text-[12px] font-semibold text-stone-600";

export default function QuickProductPanel({
  categories,
  sizeGuides,
  onCreated,
  onCancel,
}: {
  categories: CategoryOption[];
  sizeGuides: GuideOption[];
  onCreated: (product: NonNullable<QuickProductResult["product"]>) => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");

  // The three-step picker's state. `kind` is the radio; `categoryId` is the
  // node finally chosen, which may be a root or any descendant of it.
  const [kind, setKind] = useState<SellingType | "">("");
  const [categoryId, setCategoryId] = useState("");

  const [colors, setColors] = useState("");
  const [sizes, setSizes] = useState("");

  // Sizing, shown only for a sized product. "" = inherit whatever the chosen
  // category resolves to, which is the normal case.
  const [sizeGuideId, setSizeGuideId] = useState("");
  const [sizeLabel, setSizeLabel] = useState("");

  /** The guide the chosen category resolves to on its own. */
  const inheritedGuide = useMemo(() => {
    const id = inheritedGuideId(categories, categoryId ? Number(categoryId) : null, true);
    return id != null ? (sizeGuides.find((g) => g.id === id) ?? null) : null;
  }, [categories, categoryId, sizeGuides]);

  /** The guide actually in effect — the one set here, else the inherited one. */
  const resolvedGuide = sizeGuideId
    ? (sizeGuides.find((g) => String(g.id) === sizeGuideId) ?? null)
    : inheritedGuide;

  /** Switching shape drops the options the old shape owned. */
  function changeKind(next: SellingType) {
    setKind(next);
    setCategoryId("");
    if (next === "single") {
      setColors("");
      setSizes("");
    } else if (next === "colors") {
      setSizes("");
    }
    if (next !== "sizes") {
      setSizeGuideId("");
      setSizeLabel("");
    }
  }

  function submit() {
    // The server checks all of this again — this pass only exists so the
    // answer is instant and the offending field is the one that turns red.
    if (!name.trim()) return setError("Give the product a name.");
    if (!kind) return setError("Choose how the product is sold.");
    if (!categoryId) return setError("Choose a category.");

    setError(null);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("sellingType", kind);
    fd.set("categoryId", categoryId);
    fd.set("colors", kind === "single" ? "" : colors);
    fd.set("sizes", kind === "sizes" ? sizes : "");
    fd.set("sizeGuideId", kind === "sizes" ? sizeGuideId : "");
    fd.set("sizeLabel", kind === "sizes" ? sizeLabel : "");
    startTransition(async () => {
      const res = await quickCreateProductAction(fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.product) onCreated(res.product);
    });
  }

  // Prefill the size boxes from the guide the moment one resolves — the guide
  // exists precisely to say which sizes this branch offers, so making the
  // admin retype "S, M, L, XL" under a guide that already lists them is busywork.
  const guideValues = resolvedGuide?.values ?? [];
  const applyGuideSizes = () => setSizes(guideValues.join(", "));

  return (
    // Not a <form>: this panel lives inside the purchase-order form, and nested
    // forms are invalid HTML. The fields are gathered by hand on submit.
    <div className="rounded-lg border border-accent/30 bg-accent-soft/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-stone-900">New product</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-[12px] text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className={label} htmlFor="qp-name">
            Product name
          </label>
          <input
            id="qp-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Girls' Ribbed T-Shirt"
            className={field}
          />
        </div>

        {/* The shape, then the category, then the sub-category — the same
            component and the same rules as the product form. */}
        <div className="rounded-lg border border-stone-200 bg-white p-3.5">
          <CategoryPicker
            kind={kind}
            onKindChange={changeKind}
            value={categoryId}
            onChange={setCategoryId}
            error={error && !categoryId ? error : undefined}
            categories={categories}
          />
        </div>

        {/* Options: only the lists this shape actually owns. */}
        {kind && kind !== "single" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={kind === "colors" ? "sm:col-span-2" : undefined}>
              <label className={label} htmlFor="qp-colors">
                Colours{" "}
                <span className="font-normal text-stone-400">
                  {kind === "colors" ? "required" : "optional"}
                </span>
              </label>
              <input
                id="qp-colors"
                value={colors}
                onChange={(e) => setColors(e.target.value)}
                placeholder="Navy, Candy Pink"
                className={field}
              />
            </div>

            {kind === "sizes" && (
              <div>
                <label className={label} htmlFor="qp-sizes">
                  Sizes <span className="font-normal text-stone-400">required</span>
                </label>
                <input
                  id="qp-sizes"
                  value={sizes}
                  onChange={(e) => setSizes(e.target.value)}
                  placeholder="S, M, L"
                  className={field}
                />
              </div>
            )}
          </div>
        )}

        {/* Sizing — which sizes this product offers, what to call them, and
            the chart behind the storefront's "Size Chart" link. */}
        {kind === "sizes" && (
          <div className="rounded-lg border border-stone-200 bg-white p-3.5">
            <h4 className="mb-0.5 text-[12.5px] font-bold text-stone-800">Sizing</h4>
            <p className="mb-3 text-[11.5px] text-stone-500">
              Which sizes this product offers, and what to call them.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="qp-guide">
                  Size guide
                </label>
                <select
                  id="qp-guide"
                  value={sizeGuideId}
                  onChange={(e) => setSizeGuideId(e.target.value)}
                  className={field}
                >
                  <option value="">
                    {inheritedGuide ? `— Inherit: ${inheritedGuide.name} —` : "— None —"}
                  </option>
                  {sizeGuides.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={label} htmlFor="qp-size-label">
                  Label shoppers see <span className="font-normal text-stone-400">optional</span>
                </label>
                <input
                  id="qp-size-label"
                  value={sizeLabel}
                  onChange={(e) => setSizeLabel(e.target.value)}
                  placeholder={resolvedGuide?.sizeLabel || "Size"}
                  className={field}
                />
              </div>
            </div>

            {guideValues.length > 0 ? (
              <p className="mt-2 text-[11.5px] text-stone-500">
                Offers{" "}
                <span className="font-semibold text-stone-600">
                  {guideValues.slice(0, 10).join(", ")}
                  {guideValues.length > 10 ? " …" : ""}
                </span>
                {sizeGuideId ? " (set here)" : " (from the category)"}.{" "}
                <button
                  type="button"
                  onClick={applyGuideSizes}
                  className="font-semibold text-accent underline-offset-2 hover:underline"
                >
                  Use these sizes
                </button>
              </p>
            ) : (
              <p className="mt-2 text-[11.5px] text-stone-500">
                Nothing inherited — pick a guide, or type the sizes by hand above.
              </p>
            )}

            <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-stone-400">
              <Icon name="info" size={12} />
              The size chart lives on the guide — edit it under Size guides.
            </p>
          </div>
        )}
      </div>

      <p className="mt-2 text-[11.5px] text-stone-500">
        Separate with commas. Every combination becomes an option you can order against — 2 colours ×
        3 sizes gives 6.
      </p>

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
          {error}
        </p>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
        >
          <Icon name="plus" size={14} />
          {pending ? "Creating…" : "Create draft"}
        </button>
        <span className="text-[11.5px] text-stone-500">
          Saved as a draft — add photos and a price before it can go on sale.
        </span>
      </div>
    </div>
  );
}
