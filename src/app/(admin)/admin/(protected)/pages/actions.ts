"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { upsertPage, PAGE_SLUGS } from "@/server/pages/admin";
import { sanitizePageContent } from "@/server/pages/sanitize";
import { requirePermission } from "@/server/admin/guard";
import {
  saveShopLinks,
  MAX_SHOP_LINKS,
  type ShopLink,
} from "@/server/settings/footer-links";

export interface ActionResult {
  error?: string;
}

export async function savePage(
  slug: string,
  formData: FormData,
): Promise<ActionResult> {
  await requirePermission("pages");
  if (!PAGE_SLUGS.includes(slug as (typeof PAGE_SLUGS)[number])) {
    return { error: "Unknown page." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const rawContent = String(formData.get("content") ?? "");
  const content = sanitizePageContent(rawContent);
  const status = formData.get("status") === "DRAFT" ? "DRAFT" : "PUBLISHED";
  const metaTitle = String(formData.get("metaTitle") ?? "").trim() || null;
  const metaDescription = String(formData.get("metaDescription") ?? "").trim() || null;

  if (!title) return { error: "Title is required." };
  // Strip tags/whitespace to detect "empty" rich text like "<p></p>".
  if (!content.replace(/<[^>]*>/g, "").trim()) {
    return { error: "Content is required." };
  }

  await upsertPage(slug, { title, content, status, metaTitle, metaDescription });

  revalidatePath("/admin/pages");
  revalidatePath(`/pages/${slug}`);
  redirect("/admin/pages");
}

/**
 * Replace the footer's "Shop" column.
 *
 * The whole list is submitted as JSON and saved as one value — there is no
 * per-link id to PATCH, so add / edit / remove / reorder all arrive here as
 * "here is the new list". Validation is repeated server-side even though the
 * editor enforces the same rules in the browser: the action is the real
 * boundary, and a crafted POST must not be able to exceed the cap or inject an
 * off-site href.
 */
export async function saveFooterShopLinks(formData: FormData): Promise<ActionResult> {
  await requirePermission("pages");

  let parsed: unknown;
  try {
    parsed = JSON.parse(String(formData.get("links") ?? "[]"));
  } catch {
    return { error: "Could not read the links. Please try again." };
  }
  if (!Array.isArray(parsed)) return { error: "Could not read the links. Please try again." };

  if (parsed.length > MAX_SHOP_LINKS) {
    return { error: `You can add at most ${MAX_SHOP_LINKS} links.` };
  }

  const links: ShopLink[] = [];
  for (const [i, item] of parsed.entries()) {
    const row = (item ?? {}) as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const href = typeof row.href === "string" ? row.href.trim() : "";

    // Blank rows are dropped rather than rejected — the editor starts a new
    // link empty, and an admin who adds one then changes their mind shouldn't
    // be blocked from saving the rest.
    if (!label && !href) continue;
    if (!label) return { error: `Link ${i + 1} needs a label.` };
    if (!href) return { error: `Link ${i + 1} needs a URL.` };
    if (label.length > 40) return { error: `“${label}” is too long (max 40 characters).` };

    // Internal paths only. A footer link is site navigation, and accepting a
    // full URL here would let anyone with the "pages" permission point the
    // storefront's own footer at an external site.
    if (!href.startsWith("/") || href.startsWith("//")) {
      return { error: `“${label}” must link to a path on this site, starting with “/”.` };
    }

    links.push({ label, href });
  }

  const seen = new Set<string>();
  for (const l of links) {
    if (seen.has(l.href)) return { error: `“${l.href}” is linked twice.` };
    seen.add(l.href);
  }

  await saveShopLinks(links);

  // The footer renders on every storefront route, so the whole tree is stale.
  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
  return {};
}
