import { getSetting, setSetting } from "@/lib/settings";

// The "Shop" column of the storefront footer, editable from /admin/pages.
//
// Stored as ONE JSON value in the generic Setting table rather than its own
// table: the list is capped at MAX_SHOP_LINKS, is always read and written whole
// (never queried by id), and lives beside the other footer content the admin
// already edits there (company info, socials, copyright). That also means the
// feature ships without a schema migration.
//
// The footer falls back to DEFAULT_SHOP_LINKS until an admin saves for the
// first time, so an untouched install looks exactly as it does today.

const GROUP = "footer";
const KEY = "shopLinks";

/** Hard cap on how many links the Shop column may hold. */
export const MAX_SHOP_LINKS = 8;

export interface ShopLink {
  label: string;
  href: string;
}

/** What the column showed before it became editable. */
export const DEFAULT_SHOP_LINKS: ShopLink[] = [
  { label: "Electronics", href: "/category/electronics" },
  { label: "Fashion", href: "/category/fashion" },
  { label: "Home & Living", href: "/category/home-living" },
  { label: "Grocery", href: "/category/grocery" },
  { label: "Beauty", href: "/category/beauty" },
];

/**
 * Coerce whatever is in the setting into a clean list. Written defensively
 * because the stored value is free-form JSON: a hand-edited or partially
 * written row must degrade to "fewer links", never to a crashed footer.
 */
export function parseShopLinks(raw: string | null): ShopLink[] | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const links = parsed
    .map((item): ShopLink | null => {
      if (typeof item !== "object" || item === null) return null;
      const { label, href } = item as Record<string, unknown>;
      if (typeof label !== "string" || typeof href !== "string") return null;
      const clean = { label: label.trim(), href: href.trim() };
      return clean.label && clean.href ? clean : null;
    })
    .filter((l): l is ShopLink => l !== null)
    .slice(0, MAX_SHOP_LINKS);

  // An empty saved list is a real choice (hide the column), but an unparseable
  // or all-invalid one is not — treat that as "never configured" so the footer
  // keeps its defaults instead of silently losing the whole column.
  return links.length > 0 || Array.isArray(parsed) ? links : null;
}

/** The links the storefront footer should render. */
export async function getShopLinks(): Promise<ShopLink[]> {
  const stored = parseShopLinks(await getSetting(GROUP, KEY));
  return stored ?? DEFAULT_SHOP_LINKS;
}

/**
 * The links as the ADMIN should see them: identical to the storefront's, but
 * the caller can tell a configured empty list from an unconfigured one.
 */
export async function getShopLinksForAdmin(): Promise<{
  links: ShopLink[];
  configured: boolean;
}> {
  const stored = parseShopLinks(await getSetting(GROUP, KEY));
  return stored ? { links: stored, configured: true } : { links: DEFAULT_SHOP_LINKS, configured: false };
}

/** Replace the whole list. Callers must have validated/capped it already. */
export async function saveShopLinks(links: ShopLink[]): Promise<void> {
  await setSetting({
    group: GROUP,
    key: KEY,
    value: JSON.stringify(links.slice(0, MAX_SHOP_LINKS)),
  });
}
