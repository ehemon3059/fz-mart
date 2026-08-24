import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { getCompanyInfo } from "@/server/settings/company";
import { getLogoUrl } from "@/server/settings/branding";
import { getShopLinks } from "@/server/settings/footer-links";
import { LOGO_DISPLAY_WIDTH, LOGO_DISPLAY_HEIGHT, LOGO_MAX_DISPLAY_WIDTH } from "@/lib/logo-spec";
import { FacebookIcon, InstagramIcon, YoutubeIcon, TwitterIcon, PinIcon, PhoneIcon, MailIcon, ShieldCheck } from "./icons";

// Payment marks shown under the brand column. The artwork lives in
// /public/finence-logos (mirrored to R2 under branding/payments/) with each
// viewBox cropped to its ink, so the tile alone controls the size — there is no
// baked-in whitespace to fight. width/height are the intrinsic pixels at the
// brand's optical height so the browser reserves the box before the SVG lands;
// they differ per brand because a bold wordmark (VISA) reads far larger than a
// detailed illustration (COD) at the same pixel height. CSS keeps the ratio.
const PAYMENTS: { slug: string; label: string; w: number; h: number }[] = [
  { slug: "bkash", label: "bKash", w: 51, h: 24 },
  { slug: "nagad", label: "Nagad", w: 54, h: 24 },
  { slug: "rocket", label: "Rocket", w: 47, h: 30 },
  { slug: "visa", label: "VISA", w: 60, h: 21 },
  { slug: "cod", label: "Cash on Delivery", w: 34, h: 34 },
];

// The Shop column is admin-managed (/admin/pages); the rest are fixed routes.
const COLS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Customer Care",
    links: [
      { label: "Track Order", href: "/track" },
      { label: "Returns & Refunds", href: "/pages/shipping" },
      { label: "Shipping Info", href: "/pages/shipping" },
      { label: "FAQ", href: "/pages/faq" },
      { label: "Support Center", href: "/pages/support-center" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Us", href: "/pages/about-us" },
      { label: "Contact Us", href: "/pages/contact-us" },
      { label: "Company Information", href: "/pages/company-information" },
      { label: "How to Order", href: "/pages/how-to-order" },
    ],
  },
  {
    heading: "Policies",
    links: [
      { label: "Terms & Conditions", href: "/pages/terms-and-conditions" },
      { label: "Privacy Policy", href: "/pages/privacy-policy" },
      { label: "Payment", href: "/pages/payment" },
      { label: "Order Tracking", href: "/pages/order-tracking" },
    ],
  },
];

export default async function Footer() {
  const [dict, company, logoUrl, shopLinks] = await Promise.all([
    getDictionary(),
    getCompanyInfo(),
    getLogoUrl(),
    getShopLinks(),
  ]);

  // An admin who saves an empty list is choosing to hide the column, so it is
  // dropped rather than rendered as a bare heading.
  const columns = shopLinks.length
    ? [{ heading: "Shop", links: shopLinks }, ...COLS]
    : COLS;

  const socials = [
    { href: company.facebookUrl, label: "Facebook", Icon: FacebookIcon },
    { href: company.instagramUrl, label: "Instagram", Icon: InstagramIcon },
    { href: company.youtubeUrl, label: "YouTube", Icon: YoutubeIcon },
    { href: company.twitterUrl, label: "Twitter", Icon: TwitterIcon },
  ].filter((s) => s.href.trim() !== "");

  return (
    <footer className="ft">
      <div className="wrap">
        <div className="ft-top">
          <div className="ft-brand">
            <Link href="/" className="logo" aria-label="FZ Mart home">
              {logoUrl ? (
                // Admin-uploaded logo — height-constrained, width auto (capped),
                // so a high-res source stays sharp. Mirrors Header.tsx.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="FZ Mart"
                  width={LOGO_DISPLAY_WIDTH}
                  height={LOGO_DISPLAY_HEIGHT}
                  style={{
                    height: LOGO_DISPLAY_HEIGHT,
                    width: "auto",
                    maxWidth: LOGO_MAX_DISPLAY_WIDTH,
                    objectFit: "contain",
                  }}
                />
              ) : (
                <>
                  <span className="mark"><span>FZ</span></span>
                  <span><b>FZ</b><i>Mart</i></span>
                </>
              )}
            </Link>
            {company.description && <p>{company.description}</p>}

            {(company.address || company.phone || company.email) && (
              <div className="ft-contact">
                {company.address && (
                  <p className="ft-contact-row"><PinIcon size={15} /> {company.address}</p>
                )}
                {company.phone && (
                  <p className="ft-contact-row">
                    <PhoneIcon size={15} />{" "}
                    <a href={`tel:${company.phone.replace(/\s+/g, "")}`}>{company.phone}</a>
                  </p>
                )}
                {company.email && (
                  <p className="ft-contact-row">
                    <MailIcon size={15} /> <a href={`mailto:${company.email}`}>{company.email}</a>
                  </p>
                )}
              </div>
            )}

            <div className="ft-pay">
              <p className="ft-pay-hd"><ShieldCheck size={14} /> {dict.footer.weAccept}</p>
              <ul className="ft-pay-list">
                {PAYMENTS.map((p) => (
                  <li className={`pay pay-${p.slug}`} key={p.slug}>
                    {/* Plain <img>: next/image refuses to optimise SVG without
                        dangerouslyAllowSVG, and there is nothing to optimise —
                        the biggest of these is under 20 KB. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/finence-logos/${p.slug}.svg`}
                      alt={p.label}
                      title={p.label}
                      width={p.w}
                      height={p.h}
                      loading="lazy"
                      decoding="async"
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {columns.map((col) => (
            <div className="ft-col" key={col.heading}>
              <h4>{col.heading}</h4>
              {/* Keyed by label too: Returns & Refunds and Shipping Info both
                  point at /pages/shipping, and href alone collides. */}
              {col.links.map((l) => (
                <Link key={`${l.label}|${l.href}`} href={l.href}>{l.label}</Link>
              ))}
            </div>
          ))}
        </div>

        <div className="ft-bot">
          <span>© {new Date().getFullYear()} {company.copyrightText}. {dict.footer.allRightsReserved}</span>
          {socials.length > 0 && (
            <div className="ft-social">
              {socials.map(({ href, label, Icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                  <Icon />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
