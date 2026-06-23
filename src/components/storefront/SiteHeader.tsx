import Link from "next/link";
import { Icon } from "@/components/icons";

const NAV_LINKS = [
  { label: "Electronics", href: "/category/electronics" },
  { label: "Fashion",     href: "/category/fashion"     },
  { label: "Grocery",     href: "/category/grocery"     },
  { label: "Today's Deals", href: "/deals"              },
];

export function SiteHeader() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex h-16 max-w-[1100px] items-center gap-3 px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-600 text-sm font-extrabold text-white">
            FZ
          </span>
          <span className="text-[19px] font-extrabold tracking-tight">
            <span className="text-stone-800">FZ</span>
            <span className="text-brand-600">Mart</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="ml-8 hidden items-center gap-6 text-[14px] font-medium text-stone-500 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="transition hover:text-stone-900"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1 text-stone-500">
          <button
            aria-label="Search"
            className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-stone-100"
          >
            <Icon name="search" size={18} />
          </button>
          <button
            aria-label="Cart"
            className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-stone-100"
          >
            <Icon name="cart" size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
