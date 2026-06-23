"use client";

import Link from "next/link";
import { useCartStore, cartSubtotal } from "@/lib/cart-store";
import { formatTaka } from "@/lib/money";
import { BagIcon } from "./icons";

// Cart pill for the header. Reads the persisted client cart store, so it must
// be a client component. Renders a stable shell on the server, then hydrates
// the live count/total on the client to avoid a hydration mismatch.
export default function HeaderCart() {
  const items = useCartStore((s) => s.items);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = cartSubtotal(items);

  return (
    <Link href="/cart" className="icon-btn cart-btn" aria-label="Cart">
      <BagIcon size={23} />
      {count > 0 && <span className="cart-badge">{count}</span>}
      <span className="ib-txt">
        <small>Cart</small>
        <b>{formatTaka(subtotal)}</b>
      </span>
    </Link>
  );
}
