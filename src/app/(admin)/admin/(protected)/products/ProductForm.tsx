"use client";

import { useState, useTransition } from "react";
import { paisaToTaka } from "@/lib/money";
import { saveProduct } from "./actions";

interface SubcategoryOption {
  id: number;
  name: string;
  category: { name: string };
}

interface Props {
  subcategories: SubcategoryOption[];
  product?: {
    id: number;
    name: string;
    subcategoryId: number;
    description: string | null;
    price: number;
    discountPrice: number | null;
    stock: number;
    isFeatured: boolean;
    status: "ACTIVE" | "INACTIVE";
    promoBadge: string | null;
    images: { url: string }[];
  };
}

export default function ProductForm({ subcategories, product }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await saveProduct(product?.id ?? null, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          name="name"
          required
          defaultValue={product?.name}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Subcategory</label>
        <select
          name="subcategoryId"
          required
          defaultValue={product?.subcategoryId}
          className="w-full border rounded px-3 py-2"
        >
          <option value="">Select...</option>
          {subcategories.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.category.name} / {sub.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={product?.description ?? ""}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Price (BDT)</label>
          <input
            name="price"
            type="number"
            step="0.01"
            required
            defaultValue={product ? paisaToTaka(product.price) : undefined}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Discount Price (BDT, optional)
          </label>
          <input
            name="discountPrice"
            type="number"
            step="0.01"
            defaultValue={
              product?.discountPrice != null
                ? paisaToTaka(product.discountPrice)
                : undefined
            }
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Stock</label>
          <input
            name="stock"
            type="number"
            required
            defaultValue={product?.stock ?? 0}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            name="status"
            defaultValue={product?.status ?? "ACTIVE"}
            className="w-full border rounded px-3 py-2"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Promo Badge (optional)
        </label>
        <input
          name="promoBadge"
          defaultValue={product?.promoBadge ?? ""}
          placeholder="e.g. Best Seller"
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Image URLs (one per line, first is primary)
        </label>
        <textarea
          name="imageUrls"
          rows={3}
          defaultValue={product?.images.map((i) => i.url).join("\n") ?? "/placeholder.svg"}
          className="w-full border rounded px-3 py-2 font-mono text-sm"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input name="isFeatured" type="checkbox" defaultChecked={product?.isFeatured} />
        Featured on homepage
      </label>

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
