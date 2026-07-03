import Link from "next/link";
import { listActiveCategories } from "@/server/categories";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-session";
import { getDictionary } from "@/i18n/server";
import HeaderCart from "./HeaderCart";
import HeaderAccount from "./HeaderAccount";
import CategoryNav from "./CategoryNav";
import HeaderSearch from "./HeaderSearch";
import LocaleSwitcher from "./LocaleSwitcher";
import { PinIcon } from "./icons";

// Server component — fetches the category list once and renders the full
// masthead: utility bar, main bar (logo + search + account + cart) and the
// sticky category nav beneath it.
export default async function Header() {
  const [categories, session, dict] = await Promise.all([
    listActiveCategories(),
    getCurrentCustomer(),
    getDictionary(),
  ]);

  let displayName: string | null = null;
  if (session) {
    const customer = await prisma.customer.findUnique({
      where: { id: session.customerId },
      select: { name: true },
    });
    // Fall back to the email's local-part when the customer has no name yet
    // (e.g. signed in via magic link, which captures email only).
    displayName = customer?.name || session.email.split("@")[0];
  }

  return (
    <>
      {/* utility bar */}
      <div className="util">
        <div className="wrap">
          <div className="util-left">
            <span className="util-dot" />
            <span className="hide-sm">{dict.common.freeDeliveryNote}</span>
          </div>
          <div className="util-right">
            <LocaleSwitcher />
            <Link href="/track">
              <PinIcon size={14} /> {dict.common.trackOrder}
            </Link>
            <Link href="/pages/support-center" className="hide-sm">{dict.common.helpCenter}</Link>
          </div>
        </div>
      </div>

      {/* main bar */}
      <header className="hdr">
        <div className="wrap">
          <Link href="/" className="logo">
            <span className="mark"><span>FZ</span></span>
            <span><b>FZ</b><i>Mart</i></span>
          </Link>

          <HeaderSearch
            categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
          />

          <div className="hdr-actions">
            <HeaderAccount displayName={displayName} />
            <HeaderCart />
          </div>
        </div>
      </header>

      <CategoryNav categories={categories} />
    </>
  );
}
