/**
 * Settings a category branch inherits from above, computed from a flat category
 * list. Pure and dependency-free so the admin forms can run the same walk in the
 * browser that the server runs against the database.
 *
 * The walk goes UPWARD, nearest first: a value set on "Men's & Boy's Fashion"
 * covers every shirt category beneath it without being re-attached per leaf.
 * Two settings inherit this way today — `sizeGuideId` (see
 * ./size-guide-inheritance, which wraps the generic walk below) and
 * `defaultSellingType` — and they are configured together: a branch that sells
 * by SIZES needs a guide to draw its size values from, or admins fall back to
 * free-typing them.
 */

/** The lower-case client-side spelling of the Prisma `SellingType` enum. */
export type SellingType = "single" | "colors" | "sizes";

export interface InheritableCategory {
  id: number;
  parentId: number | null;
}

/**
 * The nearest non-null value at or above `startId`, as chosen by `pick`.
 *
 * `includeSelf` false answers "what would this category inherit if it set
 * nothing of its own" — which is what the category form's pickers show. The
 * `seen` set makes a cyclic parent chain terminate rather than hang; cycles are
 * blocked on write (see updateCategory) but this runs on unvalidated client
 * state, where a half-edited parent picker can briefly describe one.
 */
export function nearestInherited<C extends InheritableCategory, T>(
  categories: C[],
  startId: number | null,
  pick: (category: C) => T | null | undefined,
  includeSelf = false,
): T | null {
  if (startId == null) return null;
  const byId = new Map(categories.map((c) => [c.id, c]));
  const seen = new Set<number>();
  let cursor: number | null = includeSelf ? startId : (byId.get(startId)?.parentId ?? null);
  while (cursor != null && !seen.has(cursor)) {
    seen.add(cursor);
    const node = byId.get(cursor);
    if (!node) break;
    const value = pick(node);
    if (value != null) return value;
    cursor = node.parentId;
  }
  return null;
}

export interface SellingTypeLinkedCategory extends InheritableCategory {
  /** Prisma's enum spelling; null = inherit from an ancestor. */
  defaultSellingType?: "SINGLE" | "COLORS" | "SIZES" | null;
}

/** Prisma's enum → the spelling the product form's cards use. */
export function toSellingType(value: "SINGLE" | "COLORS" | "SIZES" | null | undefined): SellingType | null {
  if (value === "SINGLE") return "single";
  if (value === "COLORS") return "colors";
  if (value === "SIZES") return "sizes";
  return null;
}

/** The product form's spelling → Prisma's enum, for the save path. */
export function toPrismaSellingType(value: string): "SINGLE" | "COLORS" | "SIZES" | null {
  if (value === "single") return "SINGLE";
  if (value === "colors") return "COLORS";
  if (value === "sizes") return "SIZES";
  return null;
}

/** How products at or above `startId` are sold; null = nothing set anywhere up the chain. */
export function inheritedSellingType(
  categories: SellingTypeLinkedCategory[],
  startId: number | null,
  includeSelf = false,
): SellingType | null {
  return toSellingType(
    nearestInherited(categories, startId, (c) => c.defaultSellingType, includeSelf),
  );
}
