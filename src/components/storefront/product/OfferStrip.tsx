import { Tag } from "lucide-react";

/**
 * Gradient offer bar spanning the product page between the breadcrumb and the
 * hero ("Buy 1 Get 1 Free", "Eid Special — extra ৳100 off"). The text is
 * written by an admin per product.
 *
 * Deliberately tied to the discount: callers render this only when the product
 * is actually on sale, so an offer left in the field after a sale ends
 * disappears with the sale price instead of advertising a discount the shopper
 * will not get at checkout.
 *
 * Styled with Tailwind rather than the .fz stylesheet because the whole product
 * page is — the `strip-*` classes there belong to the category carousel.
 */
export default function OfferStrip({
  text,
  className = "",
}: {
  text: string;
  /** Extra classes for the wrapper — the caller owns the surrounding spacing. */
  className?: string;
}) {
  const label = text.trim();
  if (!label) return null;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-600 to-pink-500 px-3.5 py-2.5 text-[13.5px] font-bold leading-snug text-white shadow-sm ${className}`}
    >
      <Tag size={15} className="shrink-0" aria-hidden />
      {/* Long offers wrap instead of overflowing the buy box. */}
      <span className="min-w-0 break-words">{label}</span>
    </div>
  );
}
