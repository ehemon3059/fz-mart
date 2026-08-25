"use client";

/**
 * Create a product without leaving the purchase order.
 *
 * Captures only what a PO needs to reference: a name, a category, and the
 * options being ordered. No price, no photos, no stock — those belong to
 * finishing the product, and demanding them here is exactly what used to force
 * an admin to invent a price and a stock figure for goods that had not been
 * ordered yet.
 *
 * The result is a DRAFT, which cannot reach the storefront until someone
 * photographs and prices it.
 */

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { quickCreateProductAction, type QuickProductResult } from "../actions";

export interface CategoryOption {
  id: number;
  /** Indented path, e.g. "Kids › Tops › T-Shirts". */
  path: string;
}

const field =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-accent";
const label = "mb-1 block text-[12px] font-semibold text-stone-600";

export default function QuickProductPanel({
  categories,
  onCreated,
  onCancel,
}: {
  categories: CategoryOption[];
  onCreated: (product: NonNullable<QuickProductResult["product"]>) => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await quickCreateProductAction(formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.product) onCreated(res.product);
    });
  }

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

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label} htmlFor="qp-name">
            Product name
          </label>
          <input id="qp-name" name="qp-name" placeholder="e.g. Girls' Ribbed T-Shirt" className={field} />
        </div>

        <div className="sm:col-span-2">
          <label className={label} htmlFor="qp-category">
            Category
          </label>
          <select id="qp-category" name="qp-category" className={field} defaultValue="">
            <option value="">Choose…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.path}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={label} htmlFor="qp-colors">
            Colours <span className="font-normal text-stone-400">optional</span>
          </label>
          <input id="qp-colors" name="qp-colors" placeholder="Navy, Candy Pink" className={field} />
        </div>

        <div>
          <label className={label} htmlFor="qp-sizes">
            Sizes <span className="font-normal text-stone-400">optional</span>
          </label>
          <input id="qp-sizes" name="qp-sizes" placeholder="S, M, L" className={field} />
        </div>
      </div>

      <p className="mt-2 text-[11.5px] text-stone-500">
        Separate with commas. Every combination becomes an option you can order against — 2 colours ×
        3 sizes gives 6. Leave both blank for a single item.
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
          onClick={() => {
            // Read the fields directly: a nested <form> is not an option, and
            // this panel is small enough that a FormData built by hand is
            // clearer than five pieces of controlled state.
            const get = (id: string) =>
              (document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null)?.value ?? "";
            const fd = new FormData();
            fd.set("name", get("qp-name"));
            fd.set("categoryId", get("qp-category"));
            fd.set("colors", get("qp-colors"));
            fd.set("sizes", get("qp-sizes"));
            submit(fd);
          }}
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
