/**
 * Which size guide a category branch resolves to, computed from a flat category
 * list. Pure and dependency-free so the admin forms can run it in the browser —
 * it mirrors `findCategoryGuide` in server/size-guides, which does the same walk
 * against the database.
 *
 * The walk goes UPWARD, nearest first: a guide set on "Men's & Boy's Fashion"
 * covers every shirt category beneath it without being re-attached per leaf.
 */

export interface GuideLinkedCategory {
  id: number;
  parentId: number | null;
  sizeGuideId?: number | null;
}

/**
 * The nearest guide at or above `startId`.
 * `includeSelf` false answers "what would this category inherit if it set
 * nothing of its own" — which is what the category form's picker shows.
 */
export function inheritedGuideId(
  categories: GuideLinkedCategory[],
  startId: number | null,
  includeSelf = false,
): number | null {
  if (startId == null) return null;
  const byId = new Map(categories.map((c) => [c.id, c]));
  const seen = new Set<number>();
  let cursor: number | null = includeSelf ? startId : (byId.get(startId)?.parentId ?? null);
  while (cursor != null && !seen.has(cursor)) {
    seen.add(cursor);
    const node = byId.get(cursor);
    if (!node) break;
    if (node.sizeGuideId != null) return node.sizeGuideId;
    cursor = node.parentId;
  }
  return null;
}
