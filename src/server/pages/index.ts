import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/cache";
import { pageCacheKeys } from "./cache";

// Read on every storefront footer-page view, changes rarely — cache it.
const PAGE_TTL_SECONDS = 300;

export async function getPageBySlug(slug: string) {
  const page = await getOrSetCache(pageCacheKeys.bySlug(slug), PAGE_TTL_SECONDS, () =>
    prisma.page.findUnique({ where: { slug } }),
  );
  if (!page || page.status === "DRAFT") return null;
  return page;
}
