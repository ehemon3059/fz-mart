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

  return (
    <form action={handleSubmit} className="space-y-4 max-w-2xl">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          name="name"
          required
          defaultValue={flashSale?.name}
          placeholder="e.g. Mega Eid Sale"
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Starts at</label>
          <input
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={flashSale ? toLocalInputValue(flashSale.startsAt) : undefined}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Ends at</label>
          <input
            name="endsAt"
            type="datetime-local"
            required
            defaultValue={flashSale ? toLocalInputValue(flashSale.endsAt) : undefined}
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input name="isActive" type="checkbox" defaultChecked={flashSale?.isActive ?? true} />
        Active
      </label>

      <div>
        <label className="block text-sm font-medium mb-2">Products</label>
        <p className="text-xs text-gray-500 mb-2">
          Pick products for this campaign. Leave sale price blank to use the
          product&apos;s own discount price.
        </p>
        <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
          {products.map((p) => {
            const existing = flashSale?.products.find((fp) => fp.productId === p.id);
            const isChecked = checked.has(p.id);
            return (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2">
                <input
                  type="checkbox"
                  name="productId"
                  value={p.id}
                  checked={isChecked}
                  onChange={() => toggle(p.id)}
                />
                <span className="flex-1 text-sm">{p.name}</span>
                <span className="text-xs text-gray-400">
                  Regular ৳{paisaToTaka(p.price)}
                </span>
                <input
                  name={`salePrice_${p.id}`}
                  type="number"
                  step="0.01"
                  placeholder="Sale price"
                  disabled={!isChecked}
                  defaultValue={
                    existing?.salePrice != null ? paisaToTaka(existing.salePrice) : undefined
                  }
                  className="w-28 border rounded px-2 py-1 text-sm disabled:bg-gray-100"
                />
              </div>
            );
          })}
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="bg-black text-white px-4 py-2 rounded font-medium disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
