import Link from "next/link";

const FOOTER_LINKS = [
  { label: "About Us",  href: "/pages/about-us"  },
  { label: "Support",   href: "/pages/support-center" },
  { label: "Privacy",   href: "/pages/privacy-policy" },
  { label: "Terms",     href: "/pages/terms-and-conditions" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4 px-6 py-8">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-extrabold text-white">
            FZ
          </span>
          <span className="text-[14px] text-stone-500">
            © {new Date().getFullYear()} FZ-Mart Ltd. — Bangladesh&apos;s trusted online marketplace.
          </span>
        </div>

        {/* Links */}
        <nav className="flex flex-wrap gap-5">
          {FOOTER_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-[13px] font-medium text-stone-500 transition hover:text-brand-600"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
