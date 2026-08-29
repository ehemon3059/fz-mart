import { headers } from "next/headers";
import { isIpInCloudflareRange } from "@/lib/cloudflare-ranges";

/*
 * Trusted derivation of the client IP.
 *
 * THREAT MODEL: X-Forwarded-For is an append-only list. Every hop appends the
 * address it received the connection FROM, so the header looks like:
 *
 *     X-Forwarded-For: <client>, <proxy1>, <proxy2>
 *
 * The LEFTMOST entry is whatever the original client sent — including entries
 * the client invented. A client that sends "X-Forwarded-For: 1.2.3.4" to a
 * one-proxy deployment produces "1.2.3.4, <real client>": the forged value
 * lands in position 0. Reading split(",")[0] therefore reads attacker input,
 * which defeats every per-IP rate limit and lets anyone evade the IP blocklist
 * by rotating a header value.
 *
 * Crucially, "read the RIGHTMOST entry instead" is NOT a general fix, and this
 * module does not do it. Rightmost is only trustworthy when a proxy we control
 * actually APPENDED an entry. Node/Next appends nothing — base-server.js does
 *
 *     req.headers['x-forwarded-for'] ??= socket.remoteAddress
 *
 * which fills the header in only when the client sent NONE. So a client that
 * sends a single forged entry produces a header whose rightmost value is that
 * same forged entry, with the real address absent entirely. Every mode below
 * therefore relies on a header that the trusted hop OVERWRITES, never on
 * position within X-Forwarded-For:
 *
 *   TRUSTED_PROXY=vercel      Vercel's proxy sets x-vercel-forwarded-for and
 *                             overwrites it on every request, so client input
 *                             cannot reach it. Required — absent it, we are not
 *                             behind that proxy and no IP is derived.
 *
 *   TRUSTED_PROXY=cloudflare  Cloudflare sets CF-Connecting-IP, overwriting any
 *                             client-supplied value. It is trustworthy ONLY if
 *                             the request really arrived from Cloudflare, which
 *                             takes the TCP peer address — something no header
 *                             can prove. The reverse proxy checks the peer and
 *                             vouches for it; see CF_VERIFIED_HEADER below and
 *                             docs/deploy-cloudflare.md.
 *
 *   TRUSTED_PROXY=none        No proxy in front (local dev, direct-to-Node).
 *                             X-Forwarded-For is entirely untrusted and ignored.
 *
 * Unset/unknown values are treated as "none": an unconfigured deployment gets
 * the SAFE behaviour (no IP) rather than the permissive one.
 *
 * FAILING CLOSED: when no trustworthy IP can be determined this returns null,
 * and callers must deny rather than fall back to a shared constant. Bucketing
 * every unidentified request under one key ("unknown", "0.0.0.0") is worse than
 * no limit at all — one attacker exhausts the shared bucket and every genuine
 * user is locked out. See rateLimitByIp in lib/rate-limit.ts, which encodes the
 * deny-on-null decision once so no call site can get it wrong.
 */

export type TrustedProxyMode = "vercel" | "cloudflare" | "none";

export function trustedProxyMode(): TrustedProxyMode {
  const raw = process.env.TRUSTED_PROXY?.trim().toLowerCase();
  if (raw === "vercel" || raw === "cloudflare" || raw === "none") return raw;
  if (raw) {
    console.error(
      `[ip] Unknown TRUSTED_PROXY=${JSON.stringify(raw)}; treating as "none". ` +
        "Per-IP limits will deny until this is set to vercel|cloudflare|none.",
    );
  }
  return "none";
}

/**
 * Headers the reverse proxy sets after checking the REAL TCP peer against
 * Cloudflare's ranges. Only a proxy that also STRIPS any client-supplied copy
 * of these makes them meaningful — see docs/deploy-cloudflare.md.
 *
 * The "x-fzmart-" prefix is deliberate: an unusual name is unlikely to be
 * forwarded by accident from an upstream that hasn't been configured to strip
 * it, unlike a conventional name such as x-real-ip.
 */
const CF_VERIFIED_HEADER = "x-fzmart-cf-verified";
const CF_PEER_HEADER = "x-fzmart-cf-peer";

/** Strip an optional :port / [v6]:port wrapper and normalise. */
function normalizeIp(value: string): string | null {
  let ip = value.trim();
  if (!ip) return null;

  // "[2001:db8::1]:443" -> "2001:db8::1"
  const bracketed = /^\[(.+)\](?::\d+)?$/.exec(ip);
  if (bracketed) {
    ip = bracketed[1];
  } else if (ip.split(":").length === 2) {
    // "1.2.3.4:5678" -> "1.2.3.4". A bare IPv6 has more than two
    // colon-separated parts, so this only strips a port from an IPv4 literal.
    ip = ip.split(":")[0];
  }

  // IPv4-mapped IPv6 ("::ffff:1.2.3.4") -> the IPv4 form, so the same client
  // gets one rate-limit bucket regardless of how the socket reported it.
  const mapped = /^::ffff:((?:\d{1,3}\.){3}\d{1,3})$/i.exec(ip);
  if (mapped) ip = mapped[1];

  return isValidIp(ip) ? ip.toLowerCase() : null;
}

function isValidIp(ip: string): boolean {
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (v4) return v4.slice(1).every((o) => Number(o) <= 255 && String(Number(o)) === o);
  // Deliberately loose IPv6 check: hex groups and colons only. Anything that
  // passes is safe to use as an opaque Redis key; we are validating shape here,
  // not routability.
  return /^[0-9a-f:]+$/i.test(ip) && ip.includes(":") && ip.length <= 45;
}

type HeaderSource = Pick<Headers, "get">;

async function resolveHeaders(
  request?: Request | { headers: HeaderSource },
): Promise<HeaderSource> {
  if (request) return request.headers;
  return await headers();
}

/**
 * The client IP, or null when none can be established from trusted input.
 *
 * Pass the Request in route handlers; server actions and server components can
 * omit it and the ambient headers() store is used instead.
 *
 * NEVER substitute a placeholder for null — see the fail-closed note above.
 */
export async function getClientIp(
  request?: Request | { headers: HeaderSource },
): Promise<string | null> {
  const headerList = await resolveHeaders(request);
  const mode = trustedProxyMode();

  if (mode === "vercel") {
    // Vercel's proxy OVERWRITES this header on every request, so client input
    // cannot reach it. That overwrite is the entire basis for trusting it.
    //
    // There is deliberately NO x-forwarded-for fallback here. "Rightmost XFF
    // hop" is only safe when a trusted proxy actually APPENDED an entry, and
    // Node/Next append nothing: base-server.js does
    //   req.headers['x-forwarded-for'] ??= socket.remoteAddress
    // which fills the header in ONLY when the client sent none. A client that
    // sends "X-Forwarded-For: 1.2.3.4" therefore produces a header with that
    // single forged entry and no real address anywhere in it — making the
    // rightmost entry identical to the leftmost, i.e. fully attacker-
    // controlled. Verified against Next 16.3.2 with a forged curl request.
    //
    // So if the Vercel header is missing we are not behind Vercel's proxy and
    // must deny, rather than fall back to a header the client can dictate.
    return normalizeIp(headerList.get("x-vercel-forwarded-for") ?? "");
  }

  if (mode === "cloudflare") {
    const connecting = normalizeIp(headerList.get("cf-connecting-ip") ?? "");
    if (!connecting) return null;

    // CF-Connecting-IP is trustworthy only if CLOUDFLARE sent it. Verifying
    // that requires the real TCP peer address, and headers can never establish
    // it: an attacker reaching the origin directly forges the whole header set,
    // including any "peer" hop we might read out of X-Forwarded-For — they can
    // simply name a genuine Cloudflare address there and pass a range check.
    // (Verified: forging "X-Forwarded-For: 162.158.5.5" defeated exactly that
    // construction.) Next 16 exposes no socket address in userland, so the
    // check MUST happen in the reverse proxy, which does see the peer.
    //
    // nginx sets this header on the trusted path and, crucially, strips any
    // client-supplied copy — see docs/deploy-cloudflare.md for the config that
    // makes this header meaningful. Without that proxy config this returns
    // null and per-IP limits deny, which is the correct failure direction: a
    // missing check must never read as a passing one.
    const verified = headerList.get(CF_VERIFIED_HEADER);
    if (verified !== "1") return null;

    // Defence in depth. The proxy already proved the peer; this rejects a
    // malformed or non-Cloudflare value that slipped through a misconfigured
    // proxy that sets the flag too broadly.
    const peer = normalizeIp(headerList.get(CF_PEER_HEADER) ?? "");
    if (!peer || !isIpInCloudflareRange(peer)) return null;

    return connecting;
  }

  // mode === "none": nothing in front of us that we trust to append hops, so
  // every X-Forwarded-For value is client input. Next itself sets XFF to the
  // socket's remote address when the client sent no such header
  // (base-server.js: req.headers['x-forwarded-for'] ??= socket.remoteAddress),
  // so a SINGLE entry with no client-supplied header is the real peer — but we
  // cannot distinguish that from a client that sent exactly one forged entry.
  // Treat it as untrusted and return null.
  return null;
}
