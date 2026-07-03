"use client";

import { useState, useTransition } from "react";
import { paisaToTaka } from "@/lib/money";
import { saveFlashSale } from "./actions";

interface ProductOption {
  id: number;
  name: string;
  price: number;
}

interface Props {
  products: ProductOption[];
  flashSale?: {
    id: number;
    name: string;
    startsAt: Date;
    endsAt: Date;
    isActive: boolean;
    products: { productId: number; salePrice: number | null }[];
  };
}

// <input type="datetime-local"> needs "YYYY-MM-DDTHH:mm" in local time.
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function FlashSaleForm({ products, flashSale }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const selectedIds = new Set(flashSale?.products.map((p) => p.productId) ?? []);
  const [checked, setChecked] = useState<Set<number>>(selectedIds);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await saveFlashSale(flashSale?.id ?? null, formData);
      if (result?.error) setError(result.error);
    });
  }

  function toggle(id: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedCount = checked.size;
  const inputCls =
    "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[14.5px] text-stone-900 placeholder:text-stone-400 shadow-soft focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Details card */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-6">
        <h2 className="text-[15px] font-bold text-stone-900">Campaign details</h2>
        <p className="mt-0.5 text-[13px] text-stone-500">Name and the time window it runs.</p>

        <div className="mt-5 space-y-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Name</label>
            <input
              name="name"
              required
              defaultValue={flashSale?.name}
              placeholder="e.g. Mega Eid Sale"
              className={inputCls}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Starts at</label>
              <input
                name="startsAt"
                type="datetime-local"
                required
                defaultValue={flashSale ? toLocalInputValue(flashSale.startsAt) : undefined}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Ends at</label>
              <input
                name="endsAt"
                type="datetime-local"
                required
                defaultValue={flashSale ? toLocalInputValue(flashSale.endsAt) : undefined}
                className={inputCls}
              />
            </div>
          </div>

          <label className="flex w-fit cursor-pointer items-center gap-2.5 text-[14px] font-medium text-stone-700">
            <input
              name="isActive"
              type="checkbox"
              defaultChecked={flashSale?.isActive ?? true}
              className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500/30"
            />
            Active
          </label>
        </div>
      </div>

      {/* Products card */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-stone-900">Products</h2>
            <p className="mt-0.5 text-[13px] text-stone-500">
              Pick products for this campaign. Leave sale price blank to use the product&apos;s own discount price.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-semibold text-brand-700">
            {selectedCount} selected
          </span>
        </div>

        <div className="mt-4 max-h-96 divide-y divide-stone-100 overflow-y-auto rounded-xl border border-stone-200">
          {products.map((p) => {
            const existing = flashSale?.products.find((fp) => fp.productId === p.id);
            const isChecked = checked.has(p.id);
            return (
              <label
                key={p.id}
                className={`flex cursor-pointer items-start gap-3 px-3 py-3 transition-colors sm:items-center sm:px-4 ${
                  isChecked ? "bg-brand-50/40" : "hover:bg-stone-50"
                }`}
              >
                <input
                  type="checkbox"
                  name="productId"
                  value={p.id}
                  checked={isChecked}
                  onChange={() => toggle(p.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-brand-600 focus:ring-brand-500/30 sm:mt-0"
                />
                {/* Name + price: stack on mobile, inline on desktop */}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                  <span className="min-w-0 flex-1 break-words text-[14px] font-medium text-stone-800">
                    {p.name}
                  </span>
                  <span className="text-[12.5px] text-stone-400">Regular ৳{paisaToTaka(p.price)}</span>
                </div>
                <input
                  name={`salePrice_${p.id}`}
                  type="number"
                  step="0.01"
                  placeholder="Sale price"
                  disabled={!isChecked}
                  onClick={(e) => e.stopPropagation()}
                  defaultValue={
                    existing?.salePrice != null ? paisaToTaka(existing.salePrice) : undefined
                  }
                  className="w-24 shrink-0 rounded-lg border border-stone-200 px-2.5 py-1.5 text-[13.5px] text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-stone-100 disabled:text-stone-400 sm:w-28"
                />
              </label>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-[14.5px] font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save flash sale"}
        </button>
      </div>
    </form>
  );
}
