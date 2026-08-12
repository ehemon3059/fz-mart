"use client";

import { useEffect, useState } from "react";
import ProductCard, { type ProductCardData } from "./ProductCard";
import { resolveRecentlyViewed } from "@/app/(storefront)/products/recently-viewed-actions";

// Same key as the old whole-card format; the reader below accepts both shapes,
// so an existing shopper's history is upgraded in place rather than dropped.
const STORAGE_KEY = "fz-mart-recently-viewed";
const MAX_ITEMS = 12;

/**
 * "Recently viewed" — the browser remembers WHICH products, the server decides
 * what they look like now.
 *
 * This used to keep whole product cards (name, price, photo) in localStorage
 * and render them straight back, which meant a shopper kept seeing products
 * that had since been deleted, renamed or repriced — dead cards linking to a
 * 404. Only slugs are stored now, and every render resolves them against the
 * database, so anything that no longer exists silently drops out of the list.
 *
 * The cost is one server call per product-page view; the list is capped at 12
 * and looked up by an indexed unique column.
 */
export default function RecentlyViewed({ current }: { current: ProductCardData }) {
  const [items, setItems] = useState<ProductCardData[]>([]);

  useEffect(() => {
    let stored: string[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        // Tolerate the old format (an array of card objects) so an existing
        // shopper's history survives the upgrade instead of being dropped.
        if (Array.isArray(parsed)) {
          stored = parsed
            .map((entry) =>
              typeof entry === "string"
                ? entry
                : typeof entry === "object" && entry !== null && typeof (entry as { slug?: unknown }).slug === "string"
                  ? (entry as { slug: string }).slug
                  : null,
            )
            .filter((s): s is string => !!s);
        }
      }
    } catch {
      stored = [];
    }

    // Record the current product at the front, de-duplicated and capped, then
    // ask the server what the EARLIER ones actually look like now.
    const earlier = stored.filter((slug) => slug !== current.slug).slice(0, MAX_ITEMS);
    const updated = [current.slug, ...earlier].slice(0, MAX_ITEMS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      /* storage full / disabled — recording is best-effort */
    }

    if (earlier.length === 0) {
      setItems([]);
      return;
    }

    let cancelled = false;
    resolveRecentlyViewed(earlier)
      .then((fresh) => {
        if (cancelled) return;
        setItems(fresh);
        // Prune slugs the server no longer recognises, so a stale entry is
        // asked about once rather than on every page view forever.
        const alive = new Set(fresh.map((p) => p.slug));
        const pruned = [current.slug, ...earlier.filter((s) => alive.has(s))].slice(0, MAX_ITEMS);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
        } catch {
          /* best-effort */
        }
      })
      .catch(() => {
        // A failed lookup shows nothing rather than falling back to whatever
        // the browser remembered — unverified cards are the bug being fixed.
        if (!cancelled) setItems([]);
      });

    return () => {
      cancelled = true;
    };
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
