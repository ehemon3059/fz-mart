import Link from "next/link";
import { Icon } from "@/components/icons";
import { Thumb, PriceDisplay, StockDisplay, StatusPill, PromoBadge } from "./badges";
import type { AdminProduct } from "./ProductsListClient";

interface Props {
  p: AdminProduct;
  isConfirm: boolean;
  onDeleteFirst: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

/** Mobile-only product card */
export function ProductMobileCard({ p, isConfirm, onDeleteFirst, onDeleteConfirm, onDeleteCancel }: Props) {
  const thumbUrl = p.images.find((i) => i.isPrimary)?.url ?? p.images[0]?.url;

  return (
    <div
      className={[
        "overflow-hidden rounded-xl border bg-white shadow-soft transition",
        isConfirm ? "border-red-200" : "border-stone-200",
      ].join(" ")}
    >
      <div className="flex items-start gap-3 p-4">
        <Thumb url={thumbUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold leading-snug text-stone-900">{p.name}</span>
            {p.isFeatured && (
              <Icon name="star" size={13} className="shrink-0 fill-amber-400 text-amber-400" strokeWidth={1.5} />
            )}
          </div>
          <p className="mt-0.5 text-[12.5px] text-stone-400">
            {p.subcategory.category.name} / {p.subcategory.name}
          </p>
          {p.promoBadge && (
            <div className="mt-1.5">
              <PromoBadge label={p.promoBadge} />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 px-4 py-3">
        <PriceDisplay price={p.price} discountPrice={p.discountPrice} />
        <span className="h-3 w-px bg-stone-200" />
        <StockDisplay stock={p.stock} />
        <span className="h-3 w-px bg-stone-200" />
        <StatusPill status={p.status} />
      </div>

      <div
        className={[
          "flex gap-2 border-t px-4 py-3",
          isConfirm ? "border-red-100 bg-red-50/40" : "border-stone-100",
        ].join(" ")}
      >
        {!isConfirm ? (
          <>
            <Link
              href={`/admin/products/${p.id}/edit`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-stone-200 py-2.5 text-[13.5px] font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              <Icon name="pencil" size={15} /> Edit
            </Link>
            <button
              type="button"
              onClick={onDeleteFirst}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 py-2.5 text-[13.5px] font-semibold text-red-600 transition hover:bg-red-50"
            >
              <Icon name="trash" size={15} /> Delete
            </button>
          </>
        ) : (
          <div className="flex w-full items-center gap-2">
            <button
              type="button"
              onClick={onDeleteCancel}
              className="flex-1 rounded-lg border border-stone-200 py-2.5 text-[13.5px] font-semibold text-stone-600 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onDeleteConfirm}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-500 py-2.5 text-[13.5px] font-semibold text-white hover:bg-red-600"
            >
              <Icon name="trash" size={15} strokeWidth={2} /> Confirm Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
