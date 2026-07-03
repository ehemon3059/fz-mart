import { Icon } from "@/components/icons";

export default function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          name="star"
          size={size}
          className={n <= Math.round(rating) ? "text-amber-400" : "text-stone-200"}
          fill="currentColor"
        />
      ))}
    </div>
  );
}
