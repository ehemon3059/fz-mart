"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { formatTaka } from "@/lib/money";

interface Props {
  /** Paisa — the price shown in the bar. */
  price: number;
  originalPrice: number | null;
  inStock: boolean;
  isFromPrice?: boolean;
  /** Id of the element that, once scrolled past, reveals the bar. */
  revealAfterId: string;
}

/**
 * Sticky mobile purchase bar. Hidden until the shopper scrolls past the real
 * buy box, so it never covers the primary CTA it duplicates. Its button scrolls
 * back to that buy box rather than adding to the cart directly — variant
 * products need colour/size chosen first, and silently skipping that would add
 * the wrong item.
 */
export default function MobileBuyBar({
  price,
  originalPrice,
  inStock,
  isFromPrice = false,
  revealAfterId,
}: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const target = document.getElementById(revealAfterId);
    if (!target) return;

    // Reveal once the buy box's CTA has scrolled above the viewport. A plain
    // scroll listener beats IntersectionObserver here: the buy box is taller
    // than the viewport on mobile, so it is *always* intersecting and IO never
    // fires the transition we care about.
    const update = () => {
      const bottom = target.getBoundingClientRect().bottom;
      setShow(bottom < 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [revealAfterId]);

  const jumpToBuyBox = () => {
    document.getElementById(revealAfterId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const saving = originalPrice != null && originalPrice > price ? originalPrice - price : 0;

  return (
    <div
      data-mobile-buy-bar
      className={[
        // Sits directly on top of the global .mtab nav (fixed, z-60, ~62px
        // tall incl. safe area), so both stay usable at once.
        "fixed inset-x-0 z-[61] border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_-8px_rgba(15,23,42,0.25)] backdrop-blur transition-transform duration-300 md:hidden",
        show ? "translate-y-0" : "translate-y-[130%]",
      ].join(" ")}
      style={{ bottom: "calc(58px + env(safe-area-inset-bottom))" }}
      aria-hidden={!show}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            {isFromPrice && <span className="text-[11px] font-medium text-slate-500">From</span>}
            <span className="text-[19px] font-extrabold leading-none text-slate-900">
              {formatTaka(price)}
            </span>
            {saving > 0 && (
              <span className="text-[12.5px] text-slate-400 line-through">
                {formatTaka(originalPrice!)}
              </span>
            )}
          </div>
          <p className={`mt-0.5 text-[11.5px] font-semibold ${inStock ? "text-emerald-700" : "text-rose-600"}`}>
            {inStock ? "In stock · Cash on Delivery" : "Out of stock"}
          </p>
        </div>

        <button
          type="button"
          onClick={jumpToBuyBox}
          disabled={!inStock}
          tabIndex={show ? 0 : -1}
          className="btn-brand-solid flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ShoppingBag size={16} />
          Buy Now
        </button>
      </div>
    </div>
  );
}
