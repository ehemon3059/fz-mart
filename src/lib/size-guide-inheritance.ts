/**
 * Which size guide a category branch resolves to, computed from a flat category
 * list. Pure and dependency-free so the admin forms can run it in the browser —
 * it mirrors `findCategoryGuide` in server/size-guides, which does the same walk
 * against the database.
 *
 * The walk goes UPWARD, nearest first: a guide set on "Men's & Boy's Fashion"
 * covers every shirt category beneath it without being re-attached per leaf.
 * That walk is shared with the other inherited category setting
 * (`defaultSellingType`) — see ./category-inheritance for the generic version
 * this delegates to.
 */

import { nearestInherited, type InheritableCategory } from "./category-inheritance";

export interface GuideLinkedCategory extends InheritableCategory {
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
  return nearestInherited(categories, startId, (c) => c.sizeGuideId, includeSelf);
}
