"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/admin/LogoutButton";

const NAV_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/banners", label: "Banners" },
  { href: "/admin/flash-sales", label: "Flash Sales" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/faq", label: "FAQ" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/reports/stock", label: "Stock Report" },
  { href: "/admin/reports/orders", label: "Order Reports" },
  { href: "/admin/settings/shipping", label: "Shipping Zones" },
  { href: "/admin/settings/tag-manager", label: "Tag Manager" },
  { href: "/admin/settings/pixel", label: "Pixel Manager" },
  { href: "/admin/settings/ip-block", label: "IP Block" },
  { href: "/admin/settings/smtp", label: "SMTP (Mail)" },
  { href: "/admin/settings/sms", label: "SMS Gateway" },
  { href: "/admin/settings/courier", label: "Courier API" },
  { href: "/admin/settings/fraud", label: "Fraud Check API" },
];

export default function AdminSidebar({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="md:hidden flex items-center justify-between bg-gray-900 text-gray-100 px-4 py-3">
        <span className="text-lg font-bold">fz-mart Admin</span>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="p-2 -mr-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </header>

      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-56 bg-gray-900 text-gray-100 flex flex-col
          transform transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
        `}
      >
        <div className="px-4 py-5 text-lg font-bold border-b border-gray-800 flex items-center justify-between">
          fz-mart Admin
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="md:hidden p-1"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded text-sm hover:bg-gray-800 ${
                pathname === link.href ? "bg-gray-800" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-800 text-sm space-y-2">
          <p className="text-gray-400">{username}</p>
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
