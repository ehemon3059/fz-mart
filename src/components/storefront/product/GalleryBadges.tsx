import { BadgeCheck, Flame } from "lucide-react";

/**
 * Trust / discount badges floated over the top-left of the gallery. Rendered as
 * a sibling overlay so ProductGallery keeps owning its own zoom + lightbox
 * behaviour untouched.
 */
export default function GalleryBadges({
  discountPct,
  promoBadge,
}: {
  discountPct: number;
  promoBadge?: string | null;
}) {
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col items-start gap-2">
      <span className="flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-[11.5px] font-bold text-slate-800 shadow-sm ring-1 ring-slate-900/5 backdrop-blur">
        <BadgeCheck size={14} className="text-emerald-600" />
        100% Authentic
      </span>

      {discountPct > 0 && (
        <span className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-2.5 py-1.5 text-[11.5px] font-extrabold text-white shadow-sm">
          <Flame size={13} />
          {discountPct}% OFF
        </span>
      )}

      {promoBadge && (
        <span className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold text-white shadow-sm" style={{ background: "var(--brand)" }}>
          {promoBadge}
        </span>
      )}
    </div>
  );
}
