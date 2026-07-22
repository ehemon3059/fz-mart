import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { invalidateCategoryCaches } from "./cache";
import { invalidateProductCaches } from "@/server/products/cache";
import { collectDescendantIds, computeDeleteImpact, type DeleteImpact } from "./tree";

// Admin-scoped category-tree CRUD. Unlike the public listActiveCategories in
// index.ts, these return everything regardless of isActive, since staff need to
// manage hidden/disabled nodes too. Every node lives in one self-referencing
// table (parentId = null → root); a node may hold both children and products.

/** Every category row, flat + pre-sorted; the admin UI assembles the tree. */
export async function listAllCategories() {
  return prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getCategoryById(id: number) {
  return prisma.category.findUnique({ where: { id } });
}

export interface CategoryInput {
  name: string;
  // null / undefined → a root node; otherwise the parent node's id.
  parentId?: number | null;
  imageUrl?: string | null;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

/** A slug guaranteed unique across the whole tree. Tries the plain slug, then
 *  disambiguates so two nodes named the same (under different parents) coexist. */
async function uniqueSlug(name: string, ignoreId?: number): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  for (let n = 2; ; n++) {
    const clash = await prisma.category.findUnique({ where: { slug: candidate } });
    if (!clash || clash.id === ignoreId) return candidate;
    candidate = `${base}-${n}`;
  }
}

export async function createCategory(input: CategoryInput) {
  const category = await prisma.category.create({
    data: {
      name: input.name,
      slug: await uniqueSlug(input.name),
      parentId: input.parentId ?? null,
      imageUrl: input.imageUrl ?? null,
      description: input.description ?? null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
    },
  });
  await invalidateCategoryCaches(category.slug);
  await invalidateProductCaches({ categorySlug: category.slug });
  return category;
}

export async function updateCategory(id: number, input: CategoryInput) {
  const before = await prisma.category.findUnique({ where: { id } });

  // Guard against cycles: a node can't be re-parented under itself or one of
  // its own descendants.
  if (input.parentId != null && input.parentId !== before?.parentId) {
    if (input.parentId === id) throw new Error("A category can't be its own parent.");
    const all = await prisma.category.findMany({ select: { id: true, parentId: true } });
    if (collectDescendantIds(id, all).includes(input.parentId)) {
      throw new Error("Can't move a category inside one of its own sub-categories.");
    }
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      name: input.name,
      slug: await uniqueSlug(input.name, id),
      parentId: input.parentId ?? null,
      imageUrl: input.imageUrl ?? null,
      description: input.description ?? null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
    },
  });
  await invalidateCategoryCaches(category.slug);
  await invalidateProductCaches({
    categorySlug: category.slug,
    previousCategorySlug: before && before.slug !== category.slug ? before.slug : undefined,
  });
  return category;
}

/**
 * How much deleting `id` would take with it — the count of sub-categories in
 * its whole subtree and of products anywhere under it. The admin UI shows this
 * before confirming; a node is deletable only when both are 0.
 */
export async function getCategoryDeleteImpact(id: number): Promise<DeleteImpact> {
  const [cats, products] = await Promise.all([
    prisma.category.findMany({ select: { id: true, parentId: true } }),
    prisma.product.findMany({ select: { categoryId: true } }),
  ]);
  return computeDeleteImpact(
    id,
    cats,
    products.map((p) => p.categoryId),
  );
}

/**
 * Delete a node. Blocked when its subtree still holds sub-categories OR
 * products (matching the DB's onDelete: Restrict FKs, but failing early with a
 * readable reason). Throws with the impact counts so the caller can report them.
 */
export async function deleteCategory(id: number) {
  const impact = await getCategoryDeleteImpact(id);
  if (impact.descendantCount > 0 || impact.productCount > 0) {
    const err = new Error("Category is not empty.") as Error & { impact: DeleteImpact };
    err.impact = impact;
    throw err;
  }
  const category = await prisma.category.findUnique({ where: { id } });
  await prisma.category.delete({ where: { id } });
  if (category) {
    await invalidateCategoryCaches(category.slug);
    await invalidateProductCaches({ categorySlug: category.slug });
  }
}

/**
 * Reorder a node among its siblings by one slot. Fetches the sibling group
 * (same parentId), re-normalises every sibling's sortOrder to its array index
 * after the swap — so ordering stays correct even when existing rows share a
 * sortOrder (e.g. all 0). Runs in a transaction; touches only siblings.
 */
export async function moveCategorySibling(id: number, direction: "up" | "down") {
  const node = await prisma.category.findUnique({ where: { id } });
  if (!node) throw new Error("Category not found.");

  const siblings = await prisma.category.findMany({
    where: { parentId: node.parentId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true },
  });
  const i = siblings.findIndex((s) => s.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= siblings.length) return; // already at the edge

  [siblings[i], siblings[j]] = [siblings[j], siblings[i]];

  await prisma.$transaction(
    siblings.map((s, idx) =>
      prisma.category.update({ where: { id: s.id }, data: { sortOrder: idx } }),
    ),
  );
  await invalidateCategoryCaches(node.slug);
}
