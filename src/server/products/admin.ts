import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { invalidateProductCaches } from "./cache";

async function getSlugsForInvalidation(subcategoryId: number) {
  const subcategory = await prisma.subcategory.findUnique({
    where: { id: subcategoryId },
    include: { category: true },
  });
  return {
    subcategorySlug: subcategory?.slug,
    categorySlug: subcategory?.category.slug,
  };
}

export async function listAllProducts() {
  return prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      subcategory: { include: { category: true } },
    },
  });
}

export async function getProductById(id: number) {
  return prisma.product.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
}

export interface ProductInput {
  name: string;
  subcategoryId: number;
  description?: string;
  /** Paisa */
  price: number;
  /** Paisa, or null to clear */
  discountPrice?: number | null;
  stock: number;
  isFeatured?: boolean;
  status?: "ACTIVE" | "INACTIVE";
  promoBadge?: string | null;
  /** Image URLs in display order; first is primary. */
  imageUrls?: string[];
}

export async function createProduct(input: ProductInput) {
  const product = await prisma.product.create({
    data: {
      name: input.name,
      slug: slugify(input.name),
      subcategoryId: input.subcategoryId,
      description: input.description,
      price: input.price,
      discountPrice: input.discountPrice ?? null,
      stock: input.stock,
      isFeatured: input.isFeatured ?? false,
      status: input.status ?? "ACTIVE",
      promoBadge: input.promoBadge ?? null,
      images: input.imageUrls?.length
        ? {
            createMany: {
              data: input.imageUrls.map((url, i) => ({
                url,
                isPrimary: i === 0,
                sortOrder: i,
              })),
            },
          }
        : undefined,
    },
  });

  const { subcategorySlug, categorySlug } = await getSlugsForInvalidation(
    input.subcategoryId,
  );
  await invalidateProductCaches({ slug: product.slug, subcategorySlug, categorySlug });

  return product;
}

export async function updateProduct(id: number, input: ProductInput) {
  const before = await prisma.product.findUnique({
    where: { id },
    include: { subcategory: { include: { category: true } } },
  });

  const product = await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id },
      data: {
        name: input.name,
        slug: slugify(input.name),
        subcategoryId: input.subcategoryId,
        description: input.description,
        price: input.price,
        discountPrice: input.discountPrice ?? null,
        stock: input.stock,
        isFeatured: input.isFeatured ?? false,
        status: input.status ?? "ACTIVE",
        promoBadge: input.promoBadge ?? null,
      },
    });

    if (input.imageUrls) {
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (input.imageUrls.length > 0) {
        await tx.productImage.createMany({
          data: input.imageUrls.map((url, i) => ({
            productId: id,
            url,
            isPrimary: i === 0,
            sortOrder: i,
          })),
        });
      }
    }

    return updated;
  });

  const { subcategorySlug, categorySlug } = await getSlugsForInvalidation(
    input.subcategoryId,
  );
  await invalidateProductCaches({
    slug: product.slug,
    previousSlug: before?.slug !== product.slug ? before?.slug : undefined,
    subcategorySlug,
    categorySlug,
    previousSubcategorySlug:
      before?.subcategory.slug !== subcategorySlug ? before?.subcategory.slug : undefined,
    previousCategorySlug:
      before?.subcategory.category.slug !== categorySlug
        ? before?.subcategory.category.slug
        : undefined,
  });

  return product;
}

export async function deleteProduct(id: number) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { subcategory: { include: { category: true } } },
  });

  await prisma.product.delete({ where: { id } });

  if (product) {
    await invalidateProductCaches({
      slug: product.slug,
      subcategorySlug: product.subcategory.slug,
      categorySlug: product.subcategory.category.slug,
    });
  }
}
