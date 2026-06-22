"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import { trackAddToCart } from "@/lib/pixel";

interface Props {
  productId: number;
  slug: string;
  name: string;
  unitPrice: number;
  imageUrl: string | null;
  stock: number;
}

export default function AddToCartPanel({
  productId,
  slug,
  name,
  unitPrice,
  imageUrl,
  stock,
}: Props) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);
  const outOfStock = stock <= 0;

  function handleAddToCart() {
    addItem({ productId, slug, name, unitPrice, imageUrl }, quantity);
    trackAddToCart({ value: (unitPrice * quantity) / 100 });
    router.push("/cart");
  }

  function handleBuyNow() {
    addItem({ productId, slug, name, unitPrice, imageUrl }, quantity);
    trackAddToCart({ value: (unitPrice * quantity) / 100 });
    router.push(`/checkout?buyNow=${productId}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label htmlFor="qty" className="text-sm font-medium text-gray-700">
          Quantity
        </label>
        <input
          id="qty"
          type="number"
          min={1}
          max={Math.max(stock, 1)}
          value={quantity}
          disabled={outOfStock}
          onChange={(e) =>
            setQuantity(Math.max(1, Math.min(stock, Number(e.target.value) || 1)))
          }
          className="w-20 border rounded px-2 py-1"
        />
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleAddToCart}
          disabled={outOfStock}
          className="flex-1 border border-black rounded px-4 py-2 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add to Cart
        </button>
        <button
          onClick={handleBuyNow}
          disabled={outOfStock}
          className="flex-1 bg-black text-white rounded px-4 py-2 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Buy Now
        </button>
      </div>
      {outOfStock && (
        <p className="text-sm text-red-600 font-medium">Currently out of stock.</p>
      )}
    </div>
  );
}
