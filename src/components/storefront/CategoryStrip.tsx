"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CategoryVisual } from "@/components/storefront/CategoryVisual";

export interface StripItem {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
  iconKey?: string | null;
}

/**
 * Horizontally scrolling card strip, used for a category's sub-categories.
 *
 * Client-side because the arrows need the track's live scroll position: each
 * one is disabled at its end of the range, which can't be derived on the
 * server. The track stays a plain scroll container so touch/trackpad swiping
 * and keyboard scrolling keep working without the arrows.
 */
export default function CategoryStrip({
  items,
  title,
  subtitle,
  label,
}: {
  items: StripItem[];
  title: string;
  subtitle?: string;
  label?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    // -1 absorbs sub-pixel rounding, which otherwise leaves "next" enabled at
    // the very end on fractional-DPI displays.
    const max = el.scrollWidth - el.clientWidth - 1;
    setAtStart(el.scrollLeft <= 0);
    // Also true when nothing overflows, which hides both arrows entirely.
    setAtEnd(el.scrollLeft >= max);
  }, []);

  useEffect(() => {
    sync();
    const el = trackRef.current;
    if (!el) return;
    // Re-check when the track itself resizes (font swap, orientation change),
    // not just the window — the card widths are content-dependent.
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sync, items.length]);

  const scrollBy = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".strip-card");
    const step = card ? card.getBoundingClientRect().width + 14 : 200;
    el.scrollBy({ left: direction * step * 3, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  // With nothing to scroll, the arrows would both sit permanently disabled.
  const overflows = !(atStart && atEnd);

  return (
    <section className="strip-section">
      <div className="strip-head">
        <h2>{title}</h2>
        {subtitle && <span className="strip-sub">{subtitle}</span>}
      </div>

      <div className="strip-wrap">
        {overflows && (
          <button
            type="button"
            className="strip-arrow"
            onClick={() => scrollBy(-1)}
            disabled={atStart}
            aria-label="Scroll left"
          >
            &#10094;
          </button>
        )}

        <div className="strip-track" ref={trackRef} onScroll={sync} aria-label={label}>
          {items.map((item) => (
            <Link key={item.id} href={`/category/${item.slug}`} className="strip-card">
              <CategoryVisual
                name={item.name}
                slug={item.slug}
                imageUrl={item.imageUrl}
                iconKey={item.iconKey}
                imgClassName="strip-icon-img"
                iconClassName="strip-icon"
                iconSize={56}
              />
              <span>{item.name}</span>
            </Link>
          ))}
        </div>

        {overflows && (
          <button
            type="button"
            className="strip-arrow"
            onClick={() => scrollBy(1)}
            disabled={atEnd}
            aria-label="Scroll right"
          >
            &#10095;
          </button>
        )}
      </div>
    </section>
  );
}
