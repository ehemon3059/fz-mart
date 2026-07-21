"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { MenuIcon, UserIcon, ArrowRight, HeartIcon } from "./icons";
import { useMobileMenu } from "@/lib/mobile-menu-store";
import { logout } from "@/app/(storefront)/login/logout";

type Cat = { id: number; name: string; slug: string };

// Mobile-only slide-in menu. The hamburger trigger sits on the left of the
// masthead (hidden ≥761px via CSS); tapping it opens a full-height drawer with
// the account header, the category list and quick links.
export default function MobileMenu({
  categories,
  displayName,
}: {
  categories: Cat[];
  displayName: string | null;
}) {
  const open = useMobileMenu((s) => s.open);
  const setOpen = useMobileMenu((s) => s.setOpen);
  const pathname = usePathname();

  // Close on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll + close on Escape while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="hdr-menu-btn"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <MenuIcon size={24} />
      </button>

      {open && (
        <div className="mdraw-root" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="mdraw-overlay" onClick={() => setOpen(false)} />

          <aside className="mdraw-panel">
            {/* account header */}
            <div className="mdraw-hd">
              <span className="mdraw-avatar"><UserIcon size={26} /></span>
              <div className="mdraw-hd-txt">
                <b>Hello there!</b>
                {displayName ? (
                  <span>{displayName}</span>
                ) : (
                  <Link href="/login" onClick={() => setOpen(false)}>Sign in</Link>
                )}
              </div>
              <button
                type="button"
                className="mdraw-close"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="mdraw-body">
              {/* category list */}
              <nav className="mdraw-cats" aria-label="Categories">
                {categories.map((c) => (
                  <Link key={c.id} href={`/category/${c.slug}`} className="mdraw-cat" onClick={() => setOpen(false)}>
                    <span>{c.name}</span>
                    <ArrowRight size={15} />
                  </Link>
                ))}
              </nav>

              {/* quick links */}
              <div className="mdraw-quick">
                <h4>Quick Links</h4>
                <Link href="/pages/about-us" className="mdraw-quick-item" onClick={() => setOpen(false)}>
                  <UserIcon size={17} /> About Us
                </Link>
                <Link href="/wishlist" className="mdraw-quick-item" onClick={() => setOpen(false)}>
                  <HeartIcon size={17} /> Wishlist
                </Link>
                <Link href="/pages/faq" className="mdraw-quick-item" onClick={() => setOpen(false)}>
                  <span className="mdraw-q-mark">?</span> FAQs
                </Link>
              </div>

              {/* sign out — only when signed in */}
              {displayName && (
                <form action={logout} className="mdraw-signout">
                  <button type="submit">Logout</button>
                </form>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
