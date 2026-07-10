"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/admin/LogoutButton";
import { Icon, type IconName } from "@/components/icons";
import { hasPermission, ROLE_LABELS, type AdminRole, type Permission } from "@/lib/permissions";

type NavLink = { href: string; label: string; icon: IconName; area: Permission };
type NavSection = { heading?: string; links: NavLink[] };

const NAV_SECTIONS: NavSection[] = [
  {
    heading: "Catalog",
    links: [
      { href: "/admin/products", label: "Products", icon: "box", area: "products" },
      { href: "/admin/categories", label: "Categories", icon: "tag", area: "categories" },
      { href: "/admin/banners", label: "Banners", icon: "image", area: "banners" },
    ],
  },
  {
    heading: "Sales",
    links: [
      { href: "/admin/flash-sales", label: "Flash Sales", icon: "warn", area: "flash-sales" },
      { href: "/admin/coupons", label: "Coupons", icon: "tag", area: "coupons" },
      { href: "/admin/orders", label: "Orders", icon: "cart", area: "orders" },
      { href: "/admin/returns", label: "Returns", icon: "box", area: "returns" },
      { href: "/admin/reviews", label: "Reviews", icon: "star", area: "reviews" },
    ],
  },
  {
    heading: "Content",
    links: [
      { href: "/admin/pages", label: "Pages", icon: "file", area: "pages" },
      { href: "/admin/faq", label: "FAQ", icon: "info", area: "faq" },
    ],
  },
  {
    heading: "Reports",
    links: [
      { href: "/admin/reports/finance", label: "Profit & Loss", icon: "tag", area: "reports" },
      { href: "/admin/reports/stock", label: "Stock Report", icon: "grid", area: "reports" },
      { href: "/admin/reports/orders", label: "Order Reports", icon: "grid", area: "reports" },
      { href: "/admin/reports/delivery", label: "Delivery", icon: "box", area: "reports" },
      { href: "/admin/reports/abandoned-carts", label: "Abandoned Carts", icon: "cart", area: "reports" },
      { href: "/admin/subscribers", label: "Subscribers", icon: "file", area: "reports" },
    ],
  },
  {
    heading: "Administration",
    links: [
      { href: "/admin/admins", label: "Admin Users", icon: "settings", area: "admins" },
      { href: "/admin/activity", label: "Activity Log", icon: "file", area: "admins" },
    ],
  },
  {
    heading: "Settings",
    links: [
      { href: "/admin/settings/appearance", label: "Appearance", icon: "image", area: "settings" },
      { href: "/admin/settings/localization", label: "Localization", icon: "settings", area: "settings" },
      { href: "/admin/settings/inventory", label: "Inventory", icon: "settings", area: "settings" },
      { href: "/admin/settings/shipping", label: "Shipping Zones", icon: "settings", area: "settings" },
      { href: "/admin/settings/conversion", label: "Conversion", icon: "settings", area: "settings" },
      { href: "/admin/settings/payments", label: "Payments", icon: "settings", area: "settings" },
      { href: "/admin/settings/feeds", label: "Marketing Feeds", icon: "settings", area: "settings" },
      { href: "/admin/settings/tag-manager", label: "Tag Manager", icon: "settings", area: "settings" },
      { href: "/admin/settings/pixel", label: "Pixel Manager", icon: "settings", area: "settings" },
      { href: "/admin/settings/ip-block", label: "IP Block", icon: "settings", area: "settings" },
      { href: "/admin/settings/smtp", label: "SMTP (Mail)", icon: "settings", area: "settings" },
      { href: "/admin/settings/google-oauth", label: "Google Sign-In", icon: "settings", area: "settings" },
      { href: "/admin/settings/sms", label: "SMS Gateway", icon: "settings", area: "settings" },
      { href: "/admin/settings/courier", label: "Courier API", icon: "settings", area: "settings" },
      { href: "/admin/settings/fraud", label: "Fraud Check API", icon: "settings", area: "settings" },
    ],
  },
];

export default function AdminSidebar({ username, role }: { username: string; role: AdminRole }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // Hide sections/links the current role can't reach. The pages themselves are
  // still guarded server-side (area layouts) — this just keeps the nav honest.
  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    links: section.links.filter((link) => hasPermission(role, link.area)),
  })).filter((section) => section.links.length > 0);

  return (
    <>
      {/* Mobile top bar */}
      <header className="print:hidden md:hidden sticky top-0 z-30 flex items-center justify-between bg-ink text-stone-100 px-4 py-3">
        <span className="text-lg font-bold">fz-mart Admin</span>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="p-2 -mr-2 rounded-md hover:bg-white/10"
        >
          <Icon name="grid" size={22} />
        </button>
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-ink/60 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          print:hidden
          fixed md:sticky top-0 inset-y-0 left-0 z-50
          h-screen w-64 shrink-0
          bg-ink text-stone-100 flex flex-col
          transform transition-transform duration-200 ease-out
          ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
        `}
      >
        {/* Brand */}
        <div className="px-4 py-4 flex items-center justify-between border-b border-white/10">
          <span className="text-lg font-bold tracking-tight">fz-mart Admin</span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="md:hidden p-1 rounded-md hover:bg-white/10"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Nav — min-h-0 lets this flex child actually shrink so it (not the
            whole aside) scrolls; scrollbar-hidden removes the visible track. */}
        <nav className="flex-1 min-h-0 px-3 py-4 space-y-5 overflow-y-auto scrollbar-hidden">
          {/* Dashboard is visible to every active admin regardless of role. */}
          <div className="space-y-0.5">
            <Link
              href="/admin/dashboard"
              onClick={() => setOpen(false)}
              aria-current={isActive("/admin/dashboard") ? "page" : undefined}
              className={`group relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                isActive("/admin/dashboard")
                  ? "bg-brand-600/20 text-white font-medium"
                  : "text-stone-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {isActive("/admin/dashboard") && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-brand-400" />
              )}
              <Icon name="home" size={18} className={isActive("/admin/dashboard") ? "text-brand-400" : "text-stone-400 group-hover:text-stone-200"} />
              <span className="truncate">Dashboard</span>
            </Link>
          </div>
          {visibleSections.map((section, i) => (
            <div key={section.heading ?? i}>
              {section.heading && (
                <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  {section.heading}
                </p>
              )}
              <div className="space-y-0.5">
                {section.links.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`
                        group relative flex items-center gap-3 px-3 py-2 rounded-md text-sm
                        transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-400
                        ${
                          active
                            ? "bg-brand-600/20 text-white font-medium"
                            : "text-stone-300 hover:bg-white/5 hover:text-white"
                        }
                      `}
                    >
                      {active && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-brand-400" />
                      )}
                      <Icon
                        name={link.icon}
                        size={18}
                        className={active ? "text-brand-400" : "text-stone-400 group-hover:text-stone-200"}
                      />
                      <span className="truncate">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer — shrink-0 keeps it pinned to the bottom; nav (min-h-0) is
            what scrolls, so the user block can never overlap Log out. */}
        <div className="shrink-0 px-3 py-3 border-t border-white/10 space-y-1.5">
          <Link
            href="/admin/account"
            onClick={() => setOpen(false)}
            aria-current={isActive("/admin/account") ? "page" : undefined}
            className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors hover:bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600/30 text-xs font-semibold uppercase text-brand-100">
              {username.slice(0, 2)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-stone-200">{username}</span>
              <span className="block text-[11px] text-stone-400">{ROLE_LABELS[role]}</span>
            </span>
          </Link>
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
