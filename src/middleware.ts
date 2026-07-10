import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

// Two jobs run here at the edge, before page code:
//
//  1. AUTH GUARD for /admin/* — cheap cookie-presence check (Redis validation
//     happens in the admin layout, which runs in the Node runtime).
//
//  2. NONCE-BASED CSP for HTML documents — a per-request nonce is generated and
//     placed in the Content-Security-Policy header. Next 15 reads that header
//     off the REQUEST and stamps the same nonce onto every inline bootstrap
//     script it emits (see get-script-nonce-from-header in next/dist), so we can
//     drop 'unsafe-inline'/'unsafe-eval' from script-src. Our own GTM/Pixel
//     inline snippets read the nonce via next/headers and pass it to <Script>.
//
//     'strict-dynamic' lets the nonce'd bootstrap scripts load their children
//     (gtm.js, fbevents.js) without host allowlisting; supporting browsers then
//     IGNORE the host sources in script-src, so those are kept only as a
//     fallback for older browsers. Non-script directives (connect/img/frame)
//     still gate the third-party domains and are unchanged.
//
// The static headers() in next.config.ts carries the OTHER security headers
// (HSTS, X-Frame-Options, …) but NOT the CSP — the CSP is owned here so there's
// exactly one, per-request, and no double-header conflict.

const PUBLIC_ADMIN_PATHS = [
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password",
];

/** Base64 nonce from the Edge-available Web Crypto (no node:crypto at the edge). */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    // Nonce + strict-dynamic is the real gate. Host sources are a legacy
    // fallback (ignored where strict-dynamic is supported). 'unsafe-eval' is
    // added ONLY in dev, where Next's HMR/runtime needs it; production is clean.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com https://connect.facebook.net${
      isDev ? " 'unsafe-eval'" : ""
    }`,
    // Next injects inline <style> for styled-jsx/CSS; keep 'unsafe-inline' for
    // styles only (style nonces aren't propagated by Next and inline styles are
    // not a meaningful XSS vector).
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://www.google-analytics.com https://*.facebook.com https://*.ingest.sentry.io",
    "frame-src https://www.facebook.com https://td.doubleclick.net",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Admin auth guard ──
  if (pathname.startsWith("/admin") && !PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
    if (!sessionId) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // ── Per-request nonce + CSP ──
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  // Set on the REQUEST so (a) Next extracts the nonce from the CSP header and
  // stamps its inline scripts, and (b) our layouts can read x-nonce via
  // next/headers to nonce the GTM/Pixel snippets.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);
  // Expose the path to server components (the protected layout reads this).
  requestHeaders.set("x-pathname", pathname);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  // Set on the RESPONSE so the browser actually enforces the policy.
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  // Run on all routes EXCEPT Next internals and static assets, so every HTML
  // document gets a fresh nonce. Static files don't execute inline scripts, so
  // excluding them avoids needless nonce churn (and keeps their long cache
  // headers stable). The negative lookahead mirrors Next's documented matcher.
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|woff2?|ttf|map)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
