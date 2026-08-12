import Link from "next/link";
import { Star, Check } from "lucide-react";
import { formatTaka, priceColorStyle } from "@/lib/money";

interface Props {
  name: string;
  /** Category name doubling as the brand chip — the schema has no brand field. */
  brandLabel?: string | null;
  rating: { average: number; total: number };
  /** Paisa — what the shopper actually pays. */
  price: number;
  /** Paisa — struck-through original; null when not discounted. */
  originalPrice: number | null;
  inStock: boolean;
  /** Shown as "from ৳x" when variants price independently. */
  isFromPrice?: boolean;
  /** Admin-chosen price colour (#rrggbb); null/undefined = theme default. */
  priceColor?: string | null;
}

/** Half-star aware row of five. */
function Stars({ average, size = 15 }: { average: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(average) ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}
        />
      ))}
    </span>
  );
}

export default function BuyBoxHeader({
  name,
  brandLabel,
  rating,
  price,
  originalPrice,
  inStock,
  isFromPrice = false,
  priceColor,
}: Props) {
  const saving = originalPrice != null && originalPrice > price ? originalPrice - price : 0;
  // Only the live price takes the colour; the struck-through original stays
  // grey so the "old price" cue survives.
  const priceStyle = priceColorStyle(priceColor);

  return (
    <div className="space-y-3">
      {brandLabel && (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-600">
          {brandLabel}
        </span>
      )}

      <h1 className="text-[22px] font-bold leading-snug text-slate-900 sm:text-[26px]">{name}</h1>

      {/* Rating jumps to the reviews panel rather than being decorative. */}
      {rating.total > 0 ? (
        <Link href="#reviews" className="group inline-flex items-center gap-2 text-sm">
          <span className="font-bold text-slate-900">{rating.average.toFixed(1)}</span>
          <Stars average={rating.average} />
          <span className="text-slate-500 underline-offset-2 group-hover:underline">
            {rating.total} {rating.total === 1 ? "Review" : "Reviews"}
          </span>
        </Link>
      ) : (
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <Stars average={0} /> No reviews yet
        </p>
      )}

      {/* Price block */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5 pt-1">
        {isFromPrice && <span className="text-sm font-medium text-slate-500">From</span>}
        {/* tracking-tight collides the ৳ glyph with the first digit in Manrope */}
        <span className="text-[30px] font-extrabold leading-none text-slate-900" style={priceStyle}>
          {formatTaka(price)}
        </span>
        {saving > 0 && (
          <>
            <span className="text-lg text-slate-400 line-through">{formatTaka(originalPrice!)}</span>
            <span className="rounded-md bg-rose-50 px-2 py-1 text-[12px] font-bold text-rose-600 ring-1 ring-rose-200">
              Save {formatTaka(saving)}
            </span>
          </>
        )}
      </div>

      {/* Stock indicator — pulsing dot only when actually buyable. */}
      {inStock ? (
        <p className="flex items-center gap-2 text-[13.5px] font-semibold text-emerald-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
          </span>
          In Stock — Ready to Ship
        </p>
      ) : (
        <p className="flex items-center gap-2 text-[13.5px] font-semibold text-rose-600">
          <span className="h-2 w-2 rounded-full bg-rose-500" /> Out of Stock
        </p>
      )}

      {saving > 0 && inStock && (
        <p className="flex items-center gap-1.5 text-[12.5px] text-slate-500">
          <Check size={14} className="text-emerald-600" />
          Order today to lock in this price
        </p>
      )}
    </div>
  );
}
