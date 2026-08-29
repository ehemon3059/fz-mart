import type { Metadata } from "next";
import { Suspense } from "react";
import localFont from "next/font/local";
import TopProgressBar from "@/components/TopProgressBar";
import { isIpBlocked } from "@/lib/ip-block";
import { getClientIp } from "@/lib/ip";
import { SITE_NAME, SITE_TAGLINE, siteUrl } from "@/lib/seo";
import { primeSiteUrl } from "@/server/settings/site";
import "./globals.css";

/* ── Fonts ────────────────────────────────────────────────────────────────
 * All five families are LOCAL files under ./fonts, not `next/font/google`.
 *
 * next/font/google downloads its files from fonts.googleapis.com at BUILD
 * time, which made every production build depend on reaching Google. A flaky
 * connection, a VPN or a rate-limited burst of builds aborted the whole build
 * with "Failed to fetch `Geist` from Google Fonts" — nothing to do with the
 * code being built. Vendoring the woff2 files removes that dependency: builds
 * now work offline and can't be broken by someone else's network.
 *
 * Runtime behaviour is unchanged. next/font still self-hosted these files from
 * our own origin before; only the point of ACQUISITION moved from build-time
 * download to a checked-in file.
 *
 * These are the latin subsets. Adding another script (cyrillic, greek) means
 * downloading that subset's woff2 and adding a second `src` entry.
 */

// Variable fonts — one file covers the whole 100–900 axis, so `weight` is a
// range rather than a list.
const geistSans = localFont({
  src: "./fonts/geist-latin-variable.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin-variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

// Used only by the admin Pages screens (see tailwind.config.ts `font-sans`
// override there) — kept separate from Geist so the rest of the site is
// unaffected.
const manrope = localFont({
  src: "./fonts/manrope-latin-variable.woff2",
  variable: "--font-manrope",
  weight: "200 800",
  display: "swap",
});

const splineSansMono = localFont({
  src: "./fonts/spline-sans-mono-latin-variable.woff2",
  variable: "--font-spline-mono",
  weight: "300 700",
  display: "swap",
});

// Poppins ships with the category-card design. Unlike the four above it has no
// variable axis, so each weight is its own file. Pinned to the four weights the
// design actually uses — the folder also holds 300/800 and italics, which are
// left out rather than shipped unused.
const poppins = localFont({
  src: [
    { path: "./fonts/poppins/poppins-v24-latin-regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/poppins/poppins-v24-latin-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/poppins/poppins-v24-latin-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/poppins/poppins-v24-latin-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

// Async so the admin-configured domain is loaded before metadataBase is built;
// otherwise the static export would capture a cold (env/localhost) value.
export async function generateMetadata(): Promise<Metadata> {
  await primeSiteUrl();
  return {
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
}

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
  // Deliberately fails OPEN, unlike the per-IP rate limiters (which deny on a
  // null IP). This is a DENYlist: an unidentifiable IP is simply not on it, and
  // denying every request we can't attribute would take the entire storefront
  // down on a TRUSTED_PROXY misconfiguration. The blocklist is a targeted
  // ban-this-abuser tool, not the primary abuse gate — the rate limiters are,
  // and those fail closed.
  const ip = await getClientIp();
  const blocked = ip ? await isIpBlocked(ip) : false;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} ${poppins.variable} ${splineSansMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">
        {/* Top loading bar (YouTube/Facebook style). Wrapped in Suspense
            because it reads useSearchParams; the boundary keeps the rest of the
            tree eligible for static rendering. */}
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
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
