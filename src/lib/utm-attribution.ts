"use client";

// First-touch marketing attribution, browser-side.
//
// Facebook clicks are already captured via the Pixel's _fbp/_fbc cookies (see
// lib/fb-attribution.ts). This covers the OTHER paid channels — Google, TikTok,
// etc. — that tag their landing URLs with utm_* params instead.
//
// FIRST-TOUCH: we store the utm_* params from the visitor's FIRST landing in a
// long-lived cookie and never overwrite it while set, so the channel that
// actually acquired the visitor gets the credit even if they later navigate in
// from elsewhere before buying. Captured into hidden checkout fields and stored
// on the order, so a delivered order can be classified for the ROAS/CAC report.

const COOKIE = "fz_utm";
const MAX_AGE_DAYS = 30;
const FIELD_MAX = 120; // bound each value so a crafted URL can't bloat the cookie

export interface UtmAttribution {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
}

const EMPTY: UtmAttribution = { utmSource: "", utmMedium: "", utmCampaign: "" };

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function clip(value: string | null): string {
  return (value ?? "").trim().slice(0, FIELD_MAX);
}

/**
 * Capture the current URL's utm_* params as first-touch, if not already stored.
 * Safe to call on every landing (idempotent once set, and a no-op when the URL
 * carries no utm_source). Returns the stored attribution either way.
 */
export function captureUtmAttribution(): UtmAttribution {
  if (typeof window === "undefined") return EMPTY;

  const existing = readUtmAttribution();
  if (existing.utmSource) return existing; // first-touch already recorded

  const params = new URLSearchParams(window.location.search);
  const source = clip(params.get("utm_source"));
  if (!source) return EMPTY; // untagged visit — nothing to attribute

  const attribution: UtmAttribution = {
    utmSource: source,
    utmMedium: clip(params.get("utm_medium")),
    utmCampaign: clip(params.get("utm_campaign")),
  };

  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  const value = encodeURIComponent(JSON.stringify(attribution));
  document.cookie = `${COOKIE}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  return attribution;
}

/** Read the stored first-touch attribution (empty strings when none). */
export function readUtmAttribution(): UtmAttribution {
  const raw = readCookie(COOKIE);
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as Partial<UtmAttribution>;
    return {
      utmSource: clip(parsed.utmSource ?? ""),
      utmMedium: clip(parsed.utmMedium ?? ""),
      utmCampaign: clip(parsed.utmCampaign ?? ""),
    };
  } catch {
    return EMPTY;
  }
}
