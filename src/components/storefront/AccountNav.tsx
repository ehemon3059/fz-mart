"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(storefront)/login/logout";

const LINKS = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Order History" },
  { href: "/account/purchases", label: "Purchase History" },
  { href: "/account/cart-history", label: "Cart History" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/reviews", label: "My Reviews" },
];

export default function AccountNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col">
      <div className="flex gap-1 overflow-x-auto md:flex-col md:gap-0.5">
        {LINKS.map((link) => {
          const active = link.href === "/account" ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={[
                "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition",
                active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50",
              ].join(" ")}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
      <form action={logout} className="mt-3 border-t border-gray-100 pt-3 md:mt-4 md:pt-4">
        <button
          type="submit"
          className="w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          Sign out
        </button>
      </form>
    </nav>
  );
}
