// Shared SEO helpers: site identity, absolute-URL building, and the
// fallback logic for titles/descriptions. Centralised so product, category,
// and CMS pages, the sitemap, and the JSON-LD all speak with one voice.

export const SITE_NAME = "FZ Mart";
export const SITE_TAGLINE = "Cash on Delivery Store in Bangladesh";

/** Canonical origin, no trailing slash. Falls back to localhost in dev. */
export function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return url.replace(/\/$/, "");
}

/** Absolute URL for a site-relative path (or pass through an already-absolute one). */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${siteUrl()}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Collapse whitespace and strip any HTML tags — for deriving descriptions from content. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Truncate to a length that fits a meta description, on a word boundary. */
export function truncate(text: string, max = 160): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** A page's <title>, appended with the brand unless it already is the brand. */
export function pageTitle(title: string): string {
  return title === SITE_NAME ? title : `${title} — ${SITE_NAME}`;
}
