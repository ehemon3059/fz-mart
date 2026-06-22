import { invalidateCache } from "@/lib/cache";

// WHAT CLEARS EACH KEY:
//   page:slug:<slug> -> that page's own update

export const pageCacheKeys = {
  bySlug: (slug: string) => `page:slug:${slug}`,
};

export async function invalidatePageCache(slug: string): Promise<void> {
  await invalidateCache(pageCacheKeys.bySlug(slug));
}
