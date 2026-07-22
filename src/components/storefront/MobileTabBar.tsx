"use client";

import Link from "next/link";
import { useCartStore } from "@/lib/cart-store";
import { useMobileMenu } from "@/lib/mobile-menu-store";
import { HomeIcon, GridIcon, BagIcon, UserIcon } from "./icons";

// Fixed bottom navigation shown only on mobile (hidden ≥761px via CSS).
// Cart count comes from the persisted client store, so this is a client
// component — the same source HeaderCart reads.
export default function MobileTabBar({ loggedIn }: { loggedIn: boolean }) {
  const items = useCartStore((s) => s.items);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const openMenu = useMobileMenu((s) => s.setOpen);

  return (
    <nav className="mtab" aria-label="Primary mobile navigation">
      <Link href="/" className="mtab-item">
        <HomeIcon size={21} />
        <span>Home</span>
      </Link>
      <button type="button" className="mtab-item" onClick={() => openMenu(true)}>
        <GridIcon size={21} />
        <span>Menu</span>
      </button>
      <Link href="/cart" className="mtab-item">
        <span className="mtab-ic">
          <BagIcon size={21} />
          {count > 0 && <span className="mtab-badge">{count}</span>}
        </span>
        <span>Cart</span>
      </Link>
      <Link href={loggedIn ? "/account" : "/login"} className="mtab-item">
        <UserIcon size={21} />
        <span>Account</span>
      </Link>
    </nav>
  );
}
