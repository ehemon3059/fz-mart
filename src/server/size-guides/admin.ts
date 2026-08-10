import { prisma } from "@/lib/prisma";

/**
 * Admin-scoped CRUD for size guides — the reusable "what sizes does this thing
 * come in" template: the chips a shopper picks from, the label above them
 * ("Select Bust Size:") and the markdown chart behind the Size Chart link.
 *
 * A guide is a TEMPLATE, never stock: the sellable combinations still live in
 * ProductVariant. Attaching one to a category only pre-loads the product form
 * and drives the storefront's labels/ordering.
 *
 * Values are stored as rows rather than a JSON blob because their ORDER is the
 * point — S/M/L/XL and 38/40/42/44 are neither alphabetical nor numeric — and a
 * unique (guideId, value) index keeps a duplicate chip from ever existing.
 */

export interface SizeGuideInput {
  name: string;
  /** Shopper-facing label ("Bust Size"); null = the generic "Size". */
  sizeLabel: string | null;
  /** Markdown table for the Size Chart modal; null = no chart. */
  chart: string | null;
  isActive: boolean;
  /** Chip values in display order. Trimmed + de-duplicated on write. */
  values: string[];
}

/** Every guide with its values, plus how many categories/products use it. */
export async function listSizeGuides() {
  return prisma.sizeGuide.findMany({
    orderBy: [{ name: "asc" }],
    include: {
      values: { orderBy: { sortOrder: "asc" } },
      _count: { select: { categories: true, products: true } },
    },
  });
}

export async function getSizeGuideById(id: number) {
  return prisma.sizeGuide.findUnique({
    where: { id },
    include: { values: { orderBy: { sortOrder: "asc" } } },
  });
}

/** Trim, drop blanks, and keep the first occurrence of each value. */
function cleanValues(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = raw.trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

export async function createSizeGuide(input: SizeGuideInput) {
  const values = cleanValues(input.values);
  return prisma.sizeGuide.create({
    data: {
      name: input.name,
      sizeLabel: input.sizeLabel,
      chart: input.chart,
      isActive: input.isActive,
      values: { create: values.map((value, i) => ({ value, sortOrder: i })) },
    },
  });
}

/**
 * Replace a guide wholesale. The value rows are wiped and recreated rather than
 * diffed: they carry no foreign keys (a product references the GUIDE, never a
 * value), so nothing can dangle, and it keeps ordering trivially correct.
 */
export async function updateSizeGuide(id: number, input: SizeGuideInput) {
  const values = cleanValues(input.values);
  return prisma.$transaction(async (tx) => {
    await tx.sizeGuideValue.deleteMany({ where: { guideId: id } });
    return tx.sizeGuide.update({
      where: { id },
      data: {
        name: input.name,
        sizeLabel: input.sizeLabel,
        chart: input.chart,
        isActive: input.isActive,
        values: { create: values.map((value, i) => ({ value, sortOrder: i })) },
      },
    });
  });
}

export interface SizeGuideUsage {
  categoryCount: number;
  productCount: number;
  /** A few names to show in the "can't delete" message. */
  categoryNames: string[];
  productNames: string[];
}

/** Where a guide is currently attached — shown before a delete is allowed. */
export async function getSizeGuideUsage(id: number): Promise<SizeGuideUsage> {
  const [categories, products, categoryCount, productCount] = await Promise.all([
    prisma.category.findMany({ where: { sizeGuideId: id }, select: { name: true }, take: 5 }),
    prisma.product.findMany({ where: { sizeGuideId: id }, select: { name: true }, take: 5 }),
    prisma.category.count({ where: { sizeGuideId: id } }),
    prisma.product.count({ where: { sizeGuideId: id } }),
  ]);
  return {
    categoryCount,
    productCount,
    categoryNames: categories.map((c) => c.name),
    productNames: products.map((p) => p.name),
  };
}

/**
 * Delete a guide. Blocked while anything still points at it — the FKs are
 * SET NULL, so the DB would happily detach every category and product silently.
 * Failing early with the usage counts is the readable version of that.
 */
export async function deleteSizeGuide(id: number) {
  const usage = await getSizeGuideUsage(id);
  if (usage.categoryCount > 0 || usage.productCount > 0) {
    const err = new Error("Size guide is still in use.") as Error & { usage: SizeGuideUsage };
    err.usage = usage;
    throw err;
  }
  return prisma.sizeGuide.delete({ where: { id } });
}
