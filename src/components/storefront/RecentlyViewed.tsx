"use client";

import { useEffect, useState } from "react";
import ProductCard, { type ProductCardData } from "./ProductCard";

const STORAGE_KEY = "fz-mart-recently-viewed";
const MAX_ITEMS = 12;

// Fully client-side "Recently viewed": the minimal card data for each product
// is kept in localStorage, so no server round-trip and no personal data
// leaves the browser. On mount this shows the shopper's EARLIER views (the
// current product excluded) and then records the current one for next time.
export default function RecentlyViewed({ current }: { current: ProductCardData }) {
  const [items, setItems] = useState<ProductCardData[]>([]);

  useEffect(() => {
    let stored: ProductCardData[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) stored = JSON.parse(raw) as ProductCardData[];
    } catch {
      stored = [];
    }

    // Display previous views, excluding the product being viewed now.
    setItems(stored.filter((p) => p.slug !== current.slug).slice(0, MAX_ITEMS));

    // Record current at the front, de-duplicated, capped.
    const updated = [current, ...stored.filter((p) => p.slug !== current.slug)].slice(0, MAX_ITEMS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      /* storage full / disabled — recording is best-effort */
    }
  }, [current]);

  if (items.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="mb-4 text-lg font-bold text-gray-900">Recently viewed</h2>
      <div className="pgrid">
        {items.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  );
}
