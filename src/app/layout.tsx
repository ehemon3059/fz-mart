import type { Metadata } from "next";
import { Geist, Geist_Mono, Manrope, Spline_Sans_Mono } from "next/font/google";
import { isIpBlocked } from "@/lib/ip-block";
import { getClientIp } from "@/lib/client-ip";
import { SITE_NAME, SITE_TAGLINE, siteUrl } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Used only by the admin Pages screens (see tailwind.config.ts `font-sans`
// override there) — kept separate from Geist so the rest of the site is
// unaffected.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const splineSansMono = Spline_Sans_Mono({
  variable: "--font-spline-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // metadataBase lets Next resolve the relative image/canonical URLs that
  // per-page metadata produces into absolute ones for OG/Twitter/canonical.
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    // Page-level `title` strings already include the brand via lib/seo's
    // pageTitle(), so the template is just "%s" (no extra suffix).
    template: "%s",
  },
  description: "Order online, pay on delivery. Nationwide cash on delivery across Bangladesh.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Enforced here rather than in middleware: middleware runs in the Edge
  // runtime by default at this Next version, and ioredis (a raw TCP client)
  // can't run there — same constraint that applies to admin session checks.
  // This layout runs in the Node runtime for every request, before any page
  // content renders, so it gives the same practical effect.
  const ip = await getClientIp();
  const blocked = ip ? await isIpBlocked(ip) : false;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} ${splineSansMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">
        {blocked ? (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <p className="text-gray-500">
              Access from your network has been restricted.
            </p>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
