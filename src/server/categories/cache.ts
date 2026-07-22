import { invalidateCache } from "@/lib/cache";

// WHAT CLEARS EACH KEY:
//   categories:active        -> any category node create/update/delete/move
//   category:slug:<slug>     -> that node's own edit/delete
//
// listActiveCategories() drives the site-wide nav, so any node change
// invalidates it too — there's no cheap way to know which slugs a tree change
// touched without re-deriving it, so we clear the one shared key.

export const categoryCacheKeys = {
  active: () => "categories:active",
  bySlug: (slug: string) => `category:slug:${slug}`,
};

export async function invalidateCategoryCaches(slug?: string): Promise<void> {
  const keys = [categoryCacheKeys.active()];
  if (slug) keys.push(categoryCacheKeys.bySlug(slug));
  await Promise.all(keys.map((key) => invalidateCache(key)));
}
