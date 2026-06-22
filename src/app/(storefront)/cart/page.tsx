"use client";

import Image from "next/image";
import Link from "next/link";
import { useCartStore, cartSubtotal } from "@/lib/cart-store";
import { formatTaka } from "@/lib/money";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = cartSubtotal(items);

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">Your cart is empty.</p>
        <Link href="/" className="underline font-medium">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>

      <div className="divide-y border rounded-lg bg-white">
        {items.map((item) => (
          <div key={item.productId} className="flex items-center gap-4 p-4">
            <div className="relative w-16 h-16 bg-gray-100 rounded shrink-0">
              <Image
                src={item.imageUrl ?? "/placeholder.svg"}
                alt={item.name}
                fill
                className="object-cover rounded"
              />
            </div>
            <div className="flex-1">
              <Link href={`/products/${item.slug}`} className="font-medium hover:underline">
                {item.name}
              </Link>
              <p className="text-sm text-gray-500">{formatTaka(item.unitPrice)} each</p>
            </div>
            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) =>
                setQuantity(item.productId, Math.max(1, Number(e.target.value) || 1))
              }
              className="w-16 border rounded px-2 py-1 text-center"
            />
            <span className="w-20 text-right font-medium">
              {formatTaka(item.unitPrice * item.quantity)}
            </span>
            <button
              onClick={() => removeItem(item.productId)}
              className="text-red-600 text-sm hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end items-center gap-4">
        <span className="text-gray-600">Subtotal</span>
        <span className="text-xl font-bold">{formatTaka(subtotal)}</span>
      </div>

      <div className="flex justify-end">
        <Link
          href="/checkout"
          className="bg-black text-white px-6 py-3 rounded font-medium"
        >
          Proceed to Checkout
        </Link>
      </div>
    </div>
  );
}
