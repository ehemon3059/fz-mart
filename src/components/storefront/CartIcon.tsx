"use client";

import Link from "next/link";
import { useCartStore } from "@/lib/cart-store";

export default function CartIcon() {
  const items = useCartStore((s) => s.items);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <Link href="/cart" className="relative flex items-center gap-1 text-sm font-medium">
      <span aria-hidden>🛒</span>
      <span>Cart</span>
      {count > 0 && (
        <span className="absolute -top-2 -right-3 bg-black text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
          {count}
        </span>
      )}
    </Link>
  );
}
