import { getSetting, setSetting } from "@/lib/settings";

// Admin-configurable public site URL (domain). Stored in the Setting table so a
// new owner can point the store at their own domain from the admin panel —
// without editing .env or rebuilding. Everything server-side that emits an
// absolute URL (feeds, sitemap, robots, canonical/OG tags, JSON-LD, cart and
// stock emails) resolves through lib/seo, which reads the cache below.
//
// NEXT_PUBLIC_APP_URL is build-time and cannot be overridden at runtime, so the
// DB value is the source of truth; the env var is only a fallback for installs
// that haven't set a domain in the UI yet.

const GROUP = "site";
const KEY = "url";

/** Normalise to a bare origin with no trailing slash; "" if not a real URL. */
function normalize(raw: string | null | undefined): string {
  if (!raw) return "";
  let value = raw.trim();
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "";
  }
}

/** Read the configured site URL from the database (async, uncached). */
export async function getSiteUrlSetting(): Promise<string> {
  return normalize(await getSetting(GROUP, KEY));
}

/** Persist a new site URL (after normalising) and refresh the in-memory cache. */
export async function setSiteUrl(raw: string): Promise<string> {
  const value = normalize(raw);
  await setSetting({ group: GROUP, key: KEY, value });
  setCachedSiteUrl(value);
  return value;
}

// ── Synchronous cache ────────────────────────────────────────────────
// lib/seo's siteUrl()/absoluteUrl() are synchronous and called from many spots
// (including inside .map()), so we keep them sync by serving from a cached
// value primed from the DB. The cache is refreshed on write and lazily via
// primeSiteUrl() at the top of server render paths.

let cached: string | null = null;

export function getCachedSiteUrl(): string | null {
  return cached;
}

export function setCachedSiteUrl(value: string): void {
  cached = value;
}

/**
 * Load the DB value into the cache. Safe to call often; it only touches the DB
 * when the cache is cold. Call from server entry points (layout, feed routes,
 * sitemap) so the first absolute URL built in a request is already correct.
 */
export async function primeSiteUrl(): Promise<void> {
  if (cached !== null) return;
  try {
    cached = await getSiteUrlSetting();
  } catch {
    // DB unavailable (e.g. build-time prerender): fall back to env/localhost.
    cached = "";
  }
}
