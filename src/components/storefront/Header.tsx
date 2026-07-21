import Link from "next/link";
import { listActiveCategories } from "@/server/categories";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-session";
import { getDictionary } from "@/i18n/server";
import { getLogoUrl } from "@/server/settings/branding";
import { LOGO_WIDTH, LOGO_HEIGHT } from "@/lib/logo-spec";
import HeaderCart from "./HeaderCart";
import HeaderAccount from "./HeaderAccount";
import CategoryNav from "./CategoryNav";
import HeaderSearch from "./HeaderSearch";
import MobileTabBar from "./MobileTabBar";
import LocaleSwitcher from "./LocaleSwitcher";
import { PinIcon } from "./icons";

// Server component — fetches the category list once and renders the full
// masthead: utility bar, main bar (logo + search + account + cart) and the
// sticky category nav beneath it.
export default async function Header() {
  const [categories, session, dict, logoUrl] = await Promise.all([
    listActiveCategories(),
    getCurrentCustomer(),
    getDictionary(),
    getLogoUrl(),
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
          <Link href="/" className="logo" aria-label="FZ Mart home">
            {logoUrl ? (
              // Admin-uploaded logo, sized to the fixed 120×40 slot.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="FZ Mart"
                width={LOGO_WIDTH}
                height={LOGO_HEIGHT}
                style={{ width: LOGO_WIDTH, height: LOGO_HEIGHT, objectFit: "contain" }}
              />
            ) : (
              <>
                <span className="mark"><span>FZ</span></span>
                <span><b>FZ</b><i>Mart</i></span>
              </>
            )}
          </Link>

          <HeaderSearch
            categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
          />

          <div className="hdr-actions">
            {/* Account hides on mobile — it lives in the bottom tab bar instead. */}
            <div className="hdr-account">
              <HeaderAccount displayName={displayName} />
            </div>
            <HeaderCart />
          </div>
        </div>
      </header>

      <CategoryNav categories={categories} />

      {/* Mobile-only fixed bottom navigation. */}
      <MobileTabBar loggedIn={!!session} />
    </>
  );
}
