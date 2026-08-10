"use client";

/**
 * The product card as customers will see it, rendered from the live form state
 * so the admin can check the cover photo, badge and price without saving.
 */

import { Icon } from "@/components/icons";
import { resolvePrimaryImage } from "@/lib/product-images";
import { fmtTaka } from "./helpers";
import type { FormState } from "./types";

export default function LivePreview({
  form,
  basePricePaisa,
  fromPrice,
}: {
  form: FormState;
  basePricePaisa: number | "";
  fromPrice: boolean;
}) {
  // Same fallback the storefront uses: a variant product is often saved with an
  // empty gallery because every photo lives on a variant row, and the preview
  // showed the placeholder for it. resolvePrimaryImage prefers the curated
  // gallery and drops to the option photos only when there is none.
  const firstImg =
    resolvePrimaryImage({
      images: form.images.filter((i) => i.url.trim()),
      variants: form.variants,
      colors: form.colors,
    }) ?? undefined;
  // In variant mode there's no product-level discount; price is the "from" price.
  const hasDiscount =
    !fromPrice &&
    form.discountPrice !== "" &&
    basePricePaisa !== "" &&
    Number(form.discountPrice) < Number(basePricePaisa);

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="relative aspect-[4/3] bg-stone-100">
        {firstImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={firstImg} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-stone-300">
            <Icon name="image" size={36} strokeWidth={1.4} />
          </div>
        )}
        {form.promoBadge && (
          <span className="absolute left-2 top-2 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 shadow-sm">
            {form.promoBadge}
          </span>
        )}
        {form.isFeatured && (
          <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-amber-500 shadow-sm">
            <Icon name="star" size={14} strokeWidth={1.5} fill="currentColor" />
          </span>
        )}
        {form.status === "INACTIVE" && (
          <span className="absolute bottom-2 left-2 rounded-md bg-stone-900/80 px-2 py-0.5 text-[11px] font-bold text-white">
            Inactive
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 min-h-[2.5em] text-[13.5px] font-semibold leading-snug text-stone-800">
          {form.name || <span className="italic text-stone-400">Product name…</span>}
        </p>
        <div className="mt-2 flex items-baseline gap-1.5">
          {hasDiscount ? (
            <>
              <span className="text-[15px] font-bold text-stone-900">{fmtTaka(Number(form.discountPrice))}</span>
              <span className="text-[12px] text-stone-400 line-through">{fmtTaka(Number(basePricePaisa))}</span>
            </>
          ) : basePricePaisa !== "" ? (
            <span className="text-[15px] font-bold text-stone-900">
              {fromPrice && <span className="text-[12px] font-semibold text-stone-400">from </span>}
              {fmtTaka(Number(basePricePaisa))}
            </span>
          ) : (
            <span className="text-[13px] italic text-stone-400">No price set</span>
          )}
        </div>
      </div>
    </div>
  );
}
