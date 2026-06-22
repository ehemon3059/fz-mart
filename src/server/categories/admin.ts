import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { invalidateCategoryCaches } from "./cache";
import { invalidateProductCaches } from "@/server/products/cache";

// Admin-scoped category/subcategory CRUD. Unlike the public listActiveCategories
// in index.ts, these return everything regardless of isActive, since staff
// need to manage hidden/disabled rows too.

export async function listAllCategories() {
  return prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { subcategories: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function getCategoryById(id: number) {
  return prisma.category.findUnique({ where: { id } });
}

export async function listAllSubcategories() {
  return prisma.subcategory.findMany({
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    include: { category: true },
  });
}

export interface CategoryInput {
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}

export async function createCategory(input: CategoryInput) {
  const category = await prisma.category.create({
    data: {
      name: input.name,
      slug: slugify(input.name),
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
  });
  await invalidateCategoryCaches(category.slug);
  return category;
}

export async function updateCategory(id: number, input: CategoryInput) {
  const before = await prisma.category.findUnique({ where: { id } });
  const category = await prisma.category.update({
    where: { id },
    data: {
      name: input.name,
      slug: slugify(input.name),
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
  });
  await invalidateCategoryCaches(category.slug);
  if (before && before.slug !== category.slug) {
    await invalidateCategoryCaches(before.slug);
  }
  return category;
}

export async function deleteCategory(id: number) {
  // Cascades to subcategories (schema: onDelete: Cascade), which in turn
  // restrict deletion if products reference them via FK — Prisma will throw
  // if products still exist, which is the safe default.
  const category = await prisma.category.findUnique({ where: { id } });
  await prisma.category.delete({ where: { id } });
  if (category) await invalidateCategoryCaches(category.slug);
}

export interface SubcategoryInput {
  name: string;
  categoryId: number;
  sortOrder?: number;
  isActive?: boolean;
}

export async function createSubcategory(input: SubcategoryInput) {
  const subcategory = await prisma.subcategory.create({
    data: {
      name: input.name,
      slug: slugify(input.name),
      categoryId: input.categoryId,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
    include: { category: true },
  });
  await invalidateCategoryCaches();
  await invalidateProductCaches({
    subcategorySlug: subcategory.slug,
    categorySlug: subcategory.category.slug,
  });
  return subcategory;
}

export async function updateSubcategory(id: number, input: SubcategoryInput) {
  const before = await prisma.subcategory.findUnique({
    where: { id },
    include: { category: true },
  });
  const subcategory = await prisma.subcategory.update({
    where: { id },
    data: {
      name: input.name,
      slug: slugify(input.name),
      categoryId: input.categoryId,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
    include: { category: true },
  });
  await invalidateCategoryCaches();
  await invalidateProductCaches({
    subcategorySlug: subcategory.slug,
    categorySlug: subcategory.category.slug,
    previousSubcategorySlug:
      before && before.slug !== subcategory.slug ? before.slug : undefined,
    previousCategorySlug:
      before && before.category.slug !== subcategory.category.slug
        ? before.category.slug
        : undefined,
  });
  return subcategory;
}

export async function deleteSubcategory(id: number) {
  const subcategory = await prisma.subcategory.findUnique({
    where: { id },
    include: { category: true },
  });
  await prisma.subcategory.delete({ where: { id } });
  await invalidateCategoryCaches();
  if (subcategory) {
    await invalidateProductCaches({
      subcategorySlug: subcategory.slug,
      categorySlug: subcategory.category.slug,
    });
  }
}
