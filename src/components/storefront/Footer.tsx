import Link from "next/link";
import { FacebookIcon, InstagramIcon, YoutubeIcon } from "./icons";

const COLS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Shop",
    links: [
      { label: "Electronics", href: "/products" },
      { label: "Fashion", href: "/products" },
      { label: "Home & Living", href: "/products" },
      { label: "Grocery", href: "/products" },
      { label: "Beauty", href: "/products" },
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

export default function Footer() {
  return (
    <footer className="ft">
      <div className="wrap">
        <div className="ft-top">
          <div className="ft-brand">
            <Link href="/" className="logo">
              <span className="mark"><span>FZ</span></span>
              <span><b>FZ</b><i>Mart</i></span>
            </Link>
            <p>
              Bangladesh&apos;s friendly online marketplace. Quality products, honest prices
              and reliable cash-on-delivery to your doorstep.
            </p>
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
          <span>© {new Date().getFullYear()} FZ Mart. All rights reserved.</span>
          <div className="ft-social">
            <a href="#" aria-label="Facebook"><FacebookIcon /></a>
            <a href="#" aria-label="Instagram"><InstagramIcon /></a>
            <a href="#" aria-label="YouTube"><YoutubeIcon /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
