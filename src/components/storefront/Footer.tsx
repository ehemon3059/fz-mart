import Link from "next/link";

const INFO_LINKS = [
  { href: "/pages/about-us", label: "About us" },
  { href: "/pages/contact-us", label: "Contact us" },
  { href: "/pages/company-information", label: "Company Information" },
  { href: "/pages/terms-and-conditions", label: "Terms & Conditions" },
  { href: "/pages/privacy-policy", label: "Privacy Policy" },
];

const SUPPORT_LINKS = [
  { href: "/pages/support-center", label: "Support Center" },
  { href: "/pages/how-to-order", label: "How to Order" },
  { href: "/pages/order-tracking", label: "Order Tracking" },
  { href: "/pages/payment", label: "Payment" },
  { href: "/pages/shipping", label: "Shipping" },
  { href: "/pages/faq", label: "FAQ" },
];

const CONSUMER_POLICY_LINKS = [
  { href: "/pages/happy-return", label: "Happy Return" },
  { href: "/pages/refund-policy", label: "Refund Policy" },
  { href: "/pages/exchange", label: "Exchange" },
  { href: "/pages/cancellation", label: "Cancellation" },
  { href: "/pages/pre-order", label: "Pre-Order" },
  { href: "/pages/extra-discount", label: "Extra Discount" },
];

export default function Footer() {
  return (
    <footer className="border-t mt-12 py-8">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <p className="font-bold text-lg">fz-mart</p>
          <p className="mt-2 text-sm text-gray-500">Cash on Delivery only.</p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Information</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            {INFO_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Support</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            {SUPPORT_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Consumer Policy</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            {CONSUMER_POLICY_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-center text-sm text-gray-500 mt-8">
        © {new Date().getFullYear()} fz-mart
      </p>
    </footer>
  );
}
