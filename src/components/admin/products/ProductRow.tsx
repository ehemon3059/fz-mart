import Link from "next/link";
import { Icon } from "@/components/icons";
import { Thumb, PriceDisplay, StockDisplay, StatusPill, PromoBadge } from "./badges";
import { DeleteBtn } from "./DeleteBtn";
import type { AdminProduct } from "./ProductsListClient";

interface Props {
  p: AdminProduct;
  isConfirm: boolean;
  onDeleteFirst: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

/** Desktop table row */
export function ProductRow({ p, isConfirm, onDeleteFirst, onDeleteConfirm, onDeleteCancel }: Props) {
  const thumbUrl = p.images.find((i) => i.isPrimary)?.url ?? p.images[0]?.url;

  return (
    <tr
      className={[
        "border-b border-stone-100 last:border-0 transition",
        isConfirm ? "bg-red-50/40" : "hover:bg-stone-50/60",
      ].join(" ")}
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Thumb url={thumbUrl} />
          <div className="min-w-0 max-w-[360px] lg:max-w-[440px]">
            <div className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 truncate text-[14px] font-semibold text-stone-900">{p.name}</span>
              {p.isFeatured && (
                <Icon name="star" size={13} className="shrink-0 fill-amber-400 text-amber-400" strokeWidth={1.5} />
              )}
              <span className="shrink-0">
                <PromoBadge label={p.promoBadge} />
              </span>
            </div>
            <p className="mt-0.5 text-[12.5px] text-stone-400">
              {p.category.name}
            </p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5 whitespace-nowrap">
        <PriceDisplay price={p.price} discountPrice={p.discountPrice} />
      </td>
      <td className="px-5 py-3.5 whitespace-nowrap">
        <StockDisplay stock={p.stock} />
      </td>
      <td className="px-5 py-3.5 whitespace-nowrap">
        <StatusPill status={p.status} />
      </td>
      <td className="px-5 py-3.5 whitespace-nowrap text-right" colSpan={2}>
        <div className="flex items-center justify-end gap-1">
          {!isConfirm && (
            <Link
              href={`/admin/products/${p.id}/edit`}
              className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-[13px] font-semibold text-brand-700 transition hover:border-brand-300 hover:bg-brand-100"
            >
              <Icon name="pencil" size={14} />
              <span>Edit</span>
            </Link>
          )}
          <DeleteBtn
            size="sm"
            confirmed={isConfirm}
            onFirst={onDeleteFirst}
            onConfirm={onDeleteConfirm}
            onCancel={onDeleteCancel}
          />
        </div>
      </td>
    </tr>
  );
}
