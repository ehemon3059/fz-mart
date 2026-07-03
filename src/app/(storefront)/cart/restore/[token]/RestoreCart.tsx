"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/cart-store";
import type { SavedCartItem } from "@/server/cart";

// Repopulates the client cart from a recovered CartSession, then forwards to
// the cart page. Runs once on mount.
export default function RestoreCart({ items }: { items: SavedCartItem[] }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const clear = useCartStore((s) => s.clear);

  useEffect(() => {
    clear();
    for (const it of items) {
      addItem(
        {
          productId: it.productId,
          variantId: it.variantId,
          slug: it.slug,
          name: it.name,
          unitPrice: it.price,
          imageUrl: it.imageUrl,
        },
        it.quantity,
      );
    }
    router.replace("/cart");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-gray-600">Restoring your cart…</p>
    </div>
  );
}
