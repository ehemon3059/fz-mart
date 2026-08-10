import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/cache";
import { ancestorsOf } from "@/server/categories/tree";

/**
 * Resolving which size guide applies to a product.
 *
 * Precedence, nearest wins:
 *   1. the product's own sizeGuideId
 *   2. its category's, then that category's parent, up to the root
 *   3. nothing — the storefront falls back to the plain "Size" label and the
 *      chip order the variant rows happen to be in
 *
 * Walking UPWARD is what makes one guide on "Men's & Boy's Fashion" cover every
 * shirt beneath it, so an admin attaches it once instead of per leaf category.
 */

export interface ResolvedSizeGuide {
  id: number;
  name: string;
  /** "Bust Size" → "Select Bust Size:"; null = the generic "Size". */
  sizeLabel: string | null;
  /** Markdown table for the Size Chart modal. */
  chart: string | null;
  /** Chip values in display order. */
  values: string[];
  /** Where it came from — drives the admin's "inherited from …" hint. */
  source: "product" | "category";
  /** The category the guide was found on, when `source` is "category". */
  viaCategoryId: number | null;
  viaCategoryName: string | null;
}

/** Minimal rows for the upward walk; one query serves any number of lookups. */
type CategoryLink = { id: number; parentId: number | null; name: string; sizeGuideId: number | null };

/**
 * The nearest category (self first, then ancestors) carrying a guide.
 * `categories` may be supplied by a caller that already has the flat list.
 */
export async function findCategoryGuide(
  categoryId: number,
  categories?: CategoryLink[],
): Promise<{ guideId: number; category: CategoryLink } | null> {
  const flat =
    categories ??
    (await prisma.category.findMany({
      select: { id: true, parentId: true, name: true, sizeGuideId: true },
    }));
  const self = flat.find((c) => c.id === categoryId);
  if (!self) return null;
  // ancestorsOf returns root-first; reverse so the NEAREST ancestor wins.
  const chain = [self, ...ancestorsOf(categoryId, flat).reverse()];
  const hit = chain.find((c) => c.sizeGuideId != null);
  return hit ? { guideId: hit.sizeGuideId!, category: hit } : null;
}

/**
 * Read on every sized product page, changes rarely — the same cache treatment
 * the catalogue queries get. Keyed on the two inputs that decide the answer.
 */
const RESOLVE_TTL_SECONDS = 60;

/** The full guide that applies to a product, or null when none does. */
export async function resolveSizeGuide(
  productSizeGuideId: number | null,
  categoryId: number | null,
): Promise<ResolvedSizeGuide | null> {
  return getOrSetCache(
    `size-guide:resolve:${productSizeGuideId ?? "-"}:${categoryId ?? "-"}`,
    RESOLVE_TTL_SECONDS,
    () => resolveSizeGuideUncached(productSizeGuideId, categoryId),
  );
}

async function resolveSizeGuideUncached(
  productSizeGuideId: number | null,
  categoryId: number | null,
): Promise<ResolvedSizeGuide | null> {
  let guideId = productSizeGuideId ?? null;
  let via: CategoryLink | null = null;

  if (guideId == null && categoryId != null) {
    const found = await findCategoryGuide(categoryId);
    if (found) {
      guideId = found.guideId;
      via = found.category;
    }
  }
  if (guideId == null) return null;

  const guide = await prisma.sizeGuide.findUnique({
    where: { id: guideId },
    include: { values: { orderBy: { sortOrder: "asc" } } },
  });
  // Inactive guides stay attached but stop applying, so a guide can be retired
  // without hunting down every category that points at it.
  if (!guide || !guide.isActive) return null;

  return {
    id: guide.id,
    name: guide.name,
    sizeLabel: guide.sizeLabel,
    chart: guide.chart,
    values: guide.values.map((v) => v.value),
    source: via ? "category" : "product",
    viaCategoryId: via?.id ?? null,
    viaCategoryName: via?.name ?? null,
  };
}

/** Active guides only — what the pickers on the category/product forms offer. */
export async function listActiveSizeGuides() {
  return prisma.sizeGuide.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { values: { orderBy: { sortOrder: "asc" } } },
  });
}
