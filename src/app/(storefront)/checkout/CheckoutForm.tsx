"use client";

import { useMemo, useState, useTransition } from "react";
import type { ShippingZone } from "@prisma/client";
import { useCartStore, cartSubtotal, type CartItem } from "@/lib/cart-store";
import { formatTaka } from "@/lib/money";
import { placeOrder } from "./actions";

interface Props {
  zones: ShippingZone[];
  /** When set, checkout is for this single product only — bypasses the cart. */
  buyNowProductId: number | null;
}

export default function CheckoutForm({ zones, buyNowProductId }: Props) {
  const cartItems = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);

  // Buy Now bypasses the cart entirely: checkout uses ONLY that single item,
  // even if other items happen to be sitting in the cart.
  const checkoutItems: CartItem[] = useMemo(() => {
    if (buyNowProductId == null) return cartItems;
    const single = cartItems.find((i) => i.productId === buyNowProductId);
    return single ? [single] : [];
  }, [cartItems, buyNowProductId]);

  const [zoneId, setZoneId] = useState<number | "">(zones[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const subtotal = cartSubtotal(checkoutItems);
  const selectedZone = zones.find((z) => z.id === zoneId);
  const deliveryCharge = selectedZone?.charge ?? 0;
  const total = subtotal + deliveryCharge;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await placeOrder(
        checkoutItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        formData,
      );
      if (result?.error) {
        setError(result.error);
        return;
      }
      // Only clear the whole cart on a normal checkout; Buy Now should leave
      // any other cart items untouched.
      if (buyNowProductId == null) clearCart();
    });
  }

  if (checkoutItems.length === 0) {
    return <p className="text-gray-500">Your cart is empty.</p>;
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="border rounded-lg bg-white divide-y">
        {checkoutItems.map((item) => (
          <div key={item.productId} className="flex justify-between p-3 text-sm">
            <span>
              {item.name} × {item.quantity}
            </span>
            <span className="font-medium">{formatTaka(item.unitPrice * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            name="customerName"
            required
            className="w-full border rounded px-3 py-2"
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            name="customerPhone"
            required
            inputMode="numeric"
            placeholder="017XXXXXXXX"
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email (optional)
          </label>
          <input
            name="customerEmail"
            type="email"
            placeholder="you@example.com"
            className="w-full border rounded px-3 py-2"
          />
          <p className="text-xs text-gray-500 mt-1">
            We&apos;ll send an order confirmation here if provided.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Delivery Address
          </label>
          <textarea
            name="address"
            required
            rows={3}
            className="w-full border rounded px-3 py-2"
            placeholder="House, road, area, city"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Delivery Zone
          </label>
          <select
            name="shippingZoneId"
            required
            value={zoneId}
            onChange={(e) => setZoneId(Number(e.target.value))}
            className="w-full border rounded px-3 py-2"
          >
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name} — {formatTaka(zone.charge)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t pt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatTaka(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Delivery</span>
          <span>{formatTaka(deliveryCharge)}</span>
        </div>
        <div className="flex justify-between text-base font-bold pt-1">
          <span>Total</span>
          <span>{formatTaka(total)}</span>
        </div>
      </div>

      {error && (
        <p className="text-red-600 text-sm font-medium" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-black text-white rounded py-3 font-medium disabled:opacity-50"
      >
        {pending ? "Placing order..." : "Place Order (Cash on Delivery)"}
      </button>
    </form>
  );
}
