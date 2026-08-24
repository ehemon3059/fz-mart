"use client";

import { useEffect, useRef } from "react";
import { ShoppingBag } from "lucide-react";
import { formatTaka, priceColorStyle } from "@/lib/money";

interface Props {
  /** Paisa — the price shown in the bar. */
  price: number;
  originalPrice: number | null;
  inStock: boolean;
  isFromPrice?: boolean;
  /** Admin-chosen price colour (#rrggbb); null/undefined = theme default. */
  priceColor?: string | null;
  /** Id of the real buy box; the bar's button scrolls to it. */
  buyBoxId: string;
}

/**
 * Sticky mobile purchase bar, pinned above the bottom nav for the whole page.
 * Its button scrolls to the real buy box rather than adding to the cart
 * directly — variant products need colour/size chosen first, and silently
 * skipping that would add the wrong item.
 */
export default function MobileBuyBar({
  price,
  originalPrice,
  inStock,
  isFromPrice = false,
  priceColor,
  buyBoxId,
}: Props) {
  const barRef = useRef<HTMLDivElement>(null);

  // Publish the bar's real height as --buybar-h on `.fz` so the chat/scroll
  // FABs can stack above it. Measured rather than hardcoded: the bar grows a
  // line taller when a long "From ৳x,xxx ৳y,yyy" price wraps, and a stale
  // constant would let the FABs sit on top of the Buy Now button.
  useEffect(() => {
    const el = barRef.current;
    const root = el?.closest(".fz") as HTMLElement | null;
    if (!el || !root) return;

    const publish = () => {
      root.style.setProperty("--buybar-h", `${Math.round(el.offsetHeight)}px`);
    };
    publish();

    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--buybar-h");
    };
  }, []);

  const jumpToBuyBox = () => {
    document.getElementById(buyBoxId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const saving = originalPrice != null && originalPrice > price ? originalPrice - price : 0;

  return (
    <div
      ref={barRef}
      data-mobile-buy-bar
      className="mbb-root fixed inset-x-0 z-[61] border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_-8px_rgba(15,23,42,0.25)] backdrop-blur"
      // Offset from the shared --mtab-h token so the bar tracks the nav's real
      // height instead of a hand-measured 58px that drifted out of sync.
      style={{ bottom: "calc(var(--mtab-h, 58px) + env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {/* nowrap + truncate: on a 320px viewport a variant product's
              "From ৳1,299 ৳1,899" would otherwise wrap and push the bar a line
              taller. The price is the one thing that must stay on one line, so
              the struck-through original is what gets clipped if space runs out. */}
          <div className="flex items-baseline gap-2 whitespace-nowrap">
            {isFromPrice && (
              <span className="shrink-0 text-[11px] font-medium text-slate-500">From</span>
            )}
            <span
              className="shrink-0 text-[19px] font-extrabold leading-none text-slate-900"
              style={priceColorStyle(priceColor)}
            >
              {formatTaka(price)}
            </span>
            {saving > 0 && (
              <span className="truncate text-[12.5px] text-slate-400 line-through">
                {formatTaka(originalPrice!)}
              </span>
            )}
          </div>
          <p className={`mt-0.5 truncate text-[11.5px] font-semibold ${inStock ? "text-emerald-700" : "text-rose-600"}`}>
            {inStock ? "In stock · Cash on Delivery" : "Out of stock"}
          </p>
        </div>

        {/* px-4 under 360px so the button still clears the 44px tap target
            without starving the price block on an iPhone SE. */}
        <button
          type="button"
          onClick={jumpToBuyBox}
          disabled={!inStock}
          className="btn-brand-solid flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-[14px] font-bold min-[360px]:px-5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ShoppingBag size={16} />
          Buy Now
        </button>
      </div>
    </div>
  );
}
