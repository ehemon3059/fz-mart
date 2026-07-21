"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(storefront)/login/logout";
import {
  OverviewIcon,
  BagIcon,
  TruckIcon,
  CartIcon,
  HeartIcon,
  StarIcon,
  LogoutIcon,
} from "./account-icons";

const LINKS = [
  { href: "/account", label: "Overview", Icon: OverviewIcon },
  { href: "/account/orders", label: "Order History", Icon: BagIcon },
  { href: "/account/purchases", label: "Purchase History", Icon: TruckIcon },
  { href: "/account/cart-history", label: "Cart History", Icon: CartIcon },
  { href: "/account/wishlist", label: "Wishlist", Icon: HeartIcon },
  { href: "/account/reviews", label: "My Reviews", Icon: StarIcon },
];

export default function AccountNav() {
  const pathname = usePathname();

  return (
    <nav className="md:sticky md:top-24">
      {/* On desktop the links sit in a soft card; on mobile they become a
          horizontal, edge-bleeding chip scroller (scrollbar hidden). */}
      <div className="md:rounded-2xl md:border md:border-gray-100 md:bg-white md:p-2.5 md:shadow-sm">
        <div className="flex gap-2 overflow-x-auto pb-1 max-md:-mx-5 max-md:px-5 md:flex-col md:gap-1 md:overflow-visible md:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {LINKS.map(({ href, label, Icon }) => {
            const active = href === "/account" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition md:rounded-lg md:px-3 md:py-2.5",
                  active
                    ? "bg-brand-600 text-white shadow-sm md:bg-brand-50 md:text-brand-700 md:shadow-none"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 md:bg-transparent md:hover:bg-gray-50",
                ].join(" ")}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      <form action={logout} className="mt-3 md:mt-3 md:border-t md:border-gray-100 md:pt-3">
        <button
          type="submit"
          className="flex w-full items-center gap-2.5 rounded-full bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 md:rounded-lg md:bg-transparent md:px-3 md:hover:bg-red-50"
        >
          <LogoutIcon className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </form>
    </nav>
  );
}
