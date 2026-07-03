"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SearchSort } from "@/server/products/search";

interface CategoryOption {
  slug: string;
  name: string;
}

interface Props {
  facets: { colors: string[]; sizes: string[] };
  categories: CategoryOption[];
  current: {
    keyword: string;
    categorySlug: string;
    minPriceTaka: string;
    maxPriceTaka: string;
    color: string;
    size: string;
    inStockOnly: boolean;
    sort: SearchSort;
  };
}

const SORT_OPTIONS: { value: SearchSort; label: string }[] = [
  { value: "relevance", label: "Most relevant" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "bestselling", label: "Best selling" },
];

const inputCls =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900";

export default function SearchFilters({ facets, categories, current }: Props) {
  const router = useRouter();
  const [state, setState] = useState(current);

  function set<K extends keyof Props["current"]>(key: K, value: Props["current"][K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  // Build a clean query string (omit empties) and navigate. Any filter change
  // resets to page 1 — a page number from the old result set is meaningless
  // against a new filter.
  function apply(next = state) {
    const params = new URLSearchParams();
    if (next.keyword.trim()) params.set("q", next.keyword.trim());
    if (next.categorySlug) params.set("category", next.categorySlug);
    if (next.minPriceTaka) params.set("min", next.minPriceTaka);
    if (next.maxPriceTaka) params.set("max", next.maxPriceTaka);
    if (next.color) params.set("color", next.color);
    if (next.size) params.set("size", next.size);
    if (next.inStockOnly) params.set("inStock", "1");
    if (next.sort && next.sort !== "relevance") params.set("sort", next.sort);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="space-y-5"
    >
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
          Keyword
        </label>
        <input
          value={state.keyword}
          onChange={(e) => set("keyword", e.target.value)}
          placeholder="Search products…"
          className={inputCls}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
          Sort by
        </label>
        <select
          value={state.sort}
          onChange={(e) => {
            const sort = e.target.value as SearchSort;
            const next = { ...state, sort };
            setState(next);
            apply(next); // sort applies immediately
          }}
          className={inputCls}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
          Category
        </label>
        <select
          value={state.categorySlug}
          onChange={(e) => set("categorySlug", e.target.value)}
          className={inputCls}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
          Price (৳)
        </label>
        <div className="flex items-center gap-2">
          <input
            value={state.minPriceTaka}
            onChange={(e) => set("minPriceTaka", e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            placeholder="Min"
            className={inputCls}
          />
          <span className="text-stone-400">–</span>
          <input
            value={state.maxPriceTaka}
            onChange={(e) => set("maxPriceTaka", e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            placeholder="Max"
            className={inputCls}
          />
        </div>
      </div>

      {facets.colors.length > 0 && (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
            Colour
          </label>
          <select
            value={state.color}
            onChange={(e) => set("color", e.target.value)}
            className={inputCls}
          >
            <option value="">Any colour</option>
            {facets.colors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {facets.sizes.length > 0 && (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
            Size
          </label>
          <select
            value={state.size}
            onChange={(e) => set("size", e.target.value)}
            className={inputCls}
          >
            <option value="">Any size</option>
            {facets.sizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={state.inStockOnly}
          onChange={(e) => set("inStockOnly", e.target.checked)}
        />
        In stock only
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Apply filters
        </button>
        <button
          type="button"
          onClick={() => router.push("/search")}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700"
        >
          Reset
        </button>
      </div>
    </form>
  );
}
