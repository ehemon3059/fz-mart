"use client";

// Reads the Facebook click identifiers a Purchase conversion needs for good
// match quality, on the browser at checkout time:
//   fbp — the `_fbp` cookie the Meta Pixel sets on every visitor.
//   fbc — the `_fbc` cookie; if absent, derived from the `fbclid` URL param
//         that Facebook appends when a shopper clicks an ad, in Meta's
//         documented format: fb.1.<clickTimeMs>.<fbclid>.
//
// Both are captured into hidden checkout fields and stored on the order, so the
// server-side Purchase we send when the owner phone-confirms can be attributed
// back to the ad. Returns empty strings when nothing is available (pixel
// blocked, or the visitor didn't come from an ad) — never throws.

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export function getFbAttribution(): { fbp: string; fbc: string } {
  const fbp = readCookie("_fbp");
  let fbc = readCookie("_fbc");

  if (!fbc && typeof window !== "undefined") {
    const fbclid = new URLSearchParams(window.location.search).get("fbclid");
    if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
  }

  return { fbp, fbc };
}
