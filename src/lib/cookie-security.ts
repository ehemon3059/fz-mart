import "server-only";
import { headers } from "next/headers";

/*
 * One decision, made once: does the cookie we are about to set get `Secure`?
 *
 * The old rule was `secure: process.env.NODE_ENV === "production"`, which is
 * right in production and WRONG everywhere else that speaks HTTPS. A staging
 * box built without NODE_ENV=production, or a preview deployment, served
 * session cookies over TLS without the Secure attribute — so any downgrade to
 * plaintext (a stray http:// link, a captive portal, an attacker forcing one)
 * hands the session id over in the clear. That is a real leak of a real
 * credential on a box that usually holds a copy of production data.
 *
 * WHY TRUSTING x-forwarded-proto IS SAFE HERE, unlike in lib/ip.ts:
 *
 *   lib/ip.ts refuses to read client-settable forwarded headers because a
 *   forged value BUYS the attacker something — a rate-limit bypass. The trust
 *   direction is inverted for this flag. Setting `Secure` is the restrictive
 *   outcome: it tells the browser to send the cookie over HTTPS only. An
 *   attacker who forges `x-forwarded-proto: https` on a plaintext request only
 *   causes their own cookie to be withheld on future http:// requests. There is
 *   no attack in over-applying Secure, so we may believe the header when it
 *   says https and fall back to a conservative default when it does not.
 *
 *   The failure we DO care about is the reverse: concluding "http" when the
 *   browser really is on TLS, and omitting Secure. So every ambiguous case
 *   below resolves to `true`, and only a positive identification of local
 *   plaintext development resolves to `false`.
 */

/** Hosts where a browser will refuse a Secure cookie over http:// */
function isLocalhost(host: string): boolean {
  const hostname = host.replace(/:\d+$/, "").toLowerCase().replace(/^\[|\]$/g, "");
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}

/**
 * Whether the current request is served over HTTPS, and therefore whether the
 * cookies we set on it must carry `Secure`.
 *
 * Defaults to TRUE when the request context can't be read: an unnecessary
 * Secure flag breaks a local http:// dev login (loudly, and only in dev),
 * while a missing one leaks a session id (silently, in production).
 */
export async function shouldUseSecureCookies(): Promise<boolean> {
  let headerList: Headers;
  try {
    headerList = await headers();
  } catch {
    // No request scope (a script, a worker). Nothing to serve a cookie over.
    return true;
  }

  // Set by every proxy we deploy behind (Vercel, nginx, Cloudflare). Trusted
  // upward only — see the note above.
  const proto = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (proto === "https") return true;

  // Vercel identifies itself and always terminates TLS.
  if (headerList.get("x-vercel-id")) return true;

  // Cloudflare tells us the scheme the BROWSER used, which is what the cookie
  // attribute is actually about.
  const cfVisitor = headerList.get("cf-visitor");
  if (cfVisitor?.includes('"scheme":"https"')) return true;

  // Only now, having found no evidence of TLS, may we consider dropping the
  // flag — and only for a host where a Secure cookie could not work at all.
  //
  // The localhost check deliberately does NOT also require a dev NODE_ENV.
  // It used to, and that was wrong in a way only CI revealed: the E2E suite
  // runs `next start` (NODE_ENV=production) against http://localhost, so the
  // production branch set Secure on a plaintext connection, the browser
  // discarded every session cookie, and login silently never completed.
  //
  // Dropping the flag here is safe because it is gated on the HOST, not the
  // build mode: `localhost` and `127.0.0.1` are not routable off the machine,
  // so there is no network path for a cookie to leak over. Any host that can
  // be reached remotely falls through to `true` below regardless of NODE_ENV.
  const host = headerList.get("host") ?? "";
  if (isLocalhost(host)) return false;

  // Unknown scheme on a non-local host: assume TLS and set the flag.
  return true;
}

/**
 * The attribute set shared by every cookie this app issues. Callers add
 * `maxAge` and, where they differ, override `sameSite`.
 *
 * Centralised so a new cookie cannot be introduced with weaker flags than the
 * ones already audited — the failure mode this replaced was four call sites
 * each repeating the same literal.
 */
export async function secureCookieOptions(): Promise<{
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
}> {
  return {
    httpOnly: true,
    secure: await shouldUseSecureCookies(),
    sameSite: "lax",
    path: "/",
  };
}
