import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { getCompanyInfo } from "@/server/settings/company";
import { getLogoUrl } from "@/server/settings/branding";
import { LOGO_WIDTH, LOGO_HEIGHT } from "@/lib/logo-spec";
import { FacebookIcon, InstagramIcon, YoutubeIcon, TwitterIcon, PinIcon, PhoneIcon, MailIcon } from "./icons";

const COLS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Shop",
    links: [
      { label: "Electronics", href: "/category/electronics" },
      { label: "Fashion", href: "/category/fashion" },
      { label: "Home & Living", href: "/category/home-living" },
      { label: "Grocery", href: "/category/grocery" },
      { label: "Beauty", href: "/category/beauty" },
    ],
  },
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
  const [dict, company, logoUrl] = await Promise.all([
    getDictionary(),
    getCompanyInfo(),
    getLogoUrl(),
  ]);

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
                // Admin-uploaded logo, sized to the fixed 120×40 slot — mirrors Header.tsx.
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
              {["bKash", "Nagad", "Rocket", "VISA", "COD"].map((p) => (
                <span className="pay" key={p}>{p}</span>
              ))}
            </div>
          </div>

          {COLS.map((col) => (
            <div className="ft-col" key={col.heading}>
              <h4>{col.heading}</h4>
              {col.links.map((l) => (
                <Link key={l.label} href={l.href}>{l.label}</Link>
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
