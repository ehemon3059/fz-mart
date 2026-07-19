import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { deleteImage } from "@/integrations/storage";
import { invalidateProductCaches } from "./cache";
import { productInStock, notifyBackInStock } from "./stock-notify";

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
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      colors: { orderBy: { sortOrder: "asc" } },
      specifications: { orderBy: { sortOrder: "asc" } },
      features: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export interface ProductColorInput {
  name: string;
  hexCode: string;
  imageUrl?: string | null;
}

export interface ProductSpecificationInput {
  label: string;
  value: string;
}

export interface ProductVariantInput {
  /** Size/option label, e.g. "M" or "1 Litre". Null for a colour-only variant. */
  size?: string | null;
  /** Matches a ProductColor.name. Null for a size-only variant (e.g. oil). */
  colorName?: string | null;
  /** Paisa — regular price. */
  price: number;
  /** Paisa — optional sale price (< price). Null/omitted = no discount. */
  discountPrice?: number | null;
  stock: number;
  /** Show the stock count on the storefront for this variant. Default true. */
  showStock?: boolean;
}

export interface ProductInput {
  name: string;
  subcategoryId: number;
  description?: string;
  /** Paisa */
  price: number;
  /** Paisa, or null to clear */
  discountPrice?: number | null;
  /** Sourcing/purchase cost per unit (paisa) — the COGS basis. */
  purchaseCost?: number;
  stock: number;
  /** Low-stock alert threshold; 0 disables. */
  lowStockThreshold?: number;
  /** Show the "In stock (N available)" count on the storefront. Default true. */
  showStock?: boolean;
  isFeatured?: boolean;
  status?: "ACTIVE" | "INACTIVE";
  promoBadge?: string | null;
  /** Optional SEO overrides; null/undefined → storefront default. */
  metaTitle?: string | null;
  metaDescription?: string | null;
  /** Image URLs in display order; first is primary. */
  imageUrls?: string[];
  colors?: ProductColorInput[];
  specifications?: ProductSpecificationInput[];
  /** Feature bullet points, in display order. */
  features?: string[];
  /** Size/option variants (e.g. oil 500ml/1L/5L). Empty/undefined = no variants. */
  variants?: ProductVariantInput[];
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
      purchaseCost: input.purchaseCost ?? 0,
      stock: input.stock,
      lowStockThreshold: input.lowStockThreshold ?? 0,
      showStock: input.showStock ?? true,
      isFeatured: input.isFeatured ?? false,
      status: input.status ?? "ACTIVE",
      promoBadge: input.promoBadge ?? null,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
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
      colors: input.colors?.length
        ? {
            createMany: {
              data: input.colors.map((c, i) => ({
                name: c.name,
                hexCode: c.hexCode,
                imageUrl: c.imageUrl ?? null,
                sortOrder: i,
              })),
            },
          }
        : undefined,
      specifications: input.specifications?.length
        ? {
            createMany: {
              data: input.specifications.map((s, i) => ({
                label: s.label,
                value: s.value,
                sortOrder: i,
              })),
            },
          }
        : undefined,
      features: input.features?.length
        ? {
            createMany: {
              data: input.features.map((text, i) => ({ text, sortOrder: i })),
            },
          }
        : undefined,
      variants: input.variants?.length
        ? {
            createMany: {
              data: input.variants.map((v, i) => ({
                size: v.size ?? null,
                colorName: v.colorName ?? null,
                price: v.price,
                discountPrice: v.discountPrice ?? null,
                stock: v.stock,
                showStock: v.showStock ?? true,
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
  await invalidateProductCaches({
    productId: product.id,
    slug: product.slug,
    subcategorySlug,
    categorySlug,
  });

  return product;
}

export async function updateProduct(id: number, input: ProductInput) {
  const before = await prisma.product.findUnique({
    where: { id },
    include: { subcategory: { include: { category: true } } },
  });
  // Snapshot stock state before the edit, to detect an out-of-stock → in-stock
  // transition that should fire "back in stock" alerts.
  const wasInStock = await productInStock(id);

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
        purchaseCost: input.purchaseCost ?? 0,
        stock: input.stock,
      lowStockThreshold: input.lowStockThreshold ?? 0,
        showStock: input.showStock ?? true,
        isFeatured: input.isFeatured ?? false,
        status: input.status ?? "ACTIVE",
        promoBadge: input.promoBadge ?? null,
        metaTitle: input.metaTitle ?? null,
        metaDescription: input.metaDescription ?? null,
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

    if (input.colors) {
      await tx.productColor.deleteMany({ where: { productId: id } });
      if (input.colors.length > 0) {
        await tx.productColor.createMany({
          data: input.colors.map((c, i) => ({
            productId: id,
            name: c.name,
            hexCode: c.hexCode,
            imageUrl: c.imageUrl ?? null,
            sortOrder: i,
          })),
        });
      }
    }

    if (input.specifications) {
      await tx.productSpecification.deleteMany({ where: { productId: id } });
      if (input.specifications.length > 0) {
        await tx.productSpecification.createMany({
          data: input.specifications.map((s, i) => ({
            productId: id,
            label: s.label,
            value: s.value,
            sortOrder: i,
          })),
        });
      }
    }

    if (input.features) {
      await tx.productFeature.deleteMany({ where: { productId: id } });
      if (input.features.length > 0) {
        await tx.productFeature.createMany({
          data: input.features.map((text, i) => ({ productId: id, text, sortOrder: i })),
        });
      }
    }

    if (input.variants) {
      // Replace the variant set. Historical order rows keep their own snapshot
      // (variantLabel) and their variantId is set null on delete, so wiping
      // variants here never corrupts past orders.
      await tx.productVariant.deleteMany({ where: { productId: id } });
      if (input.variants.length > 0) {
        await tx.productVariant.createMany({
          data: input.variants.map((v, i) => ({
            productId: id,
            size: v.size ?? null,
            colorName: v.colorName ?? null,
            price: v.price,
            discountPrice: v.discountPrice ?? null,
            stock: v.stock,
            showStock: v.showStock ?? true,
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
    productId: product.id,
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

  // Restock alert: if this edit took the product from out-of-stock to
  // in-stock, notify everyone who asked. Fire-and-forget — never block the save.
  if (!wasInStock && (await productInStock(id))) {
    notifyBackInStock(id).catch((err) =>
      console.error("[products] back-in-stock notify failed:", err),
    );
  }

  return product;
}

export async function deleteProduct(id: number) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      subcategory: { include: { category: true } },
      images: { select: { url: true } },
      colors: { select: { imageUrl: true } },
    },
  });

  await prisma.product.delete({ where: { id } });

  if (product) {
    await invalidateProductCaches({
      productId: product.id,
      slug: product.slug,
      subcategorySlug: product.subcategory.slug,
      categorySlug: product.subcategory.category.slug,
    });
    // Best-effort cleanup of stored objects (no-ops for seed/external URLs).
    const urls = [
      ...product.images.map((i) => i.url),
      ...product.colors.map((c) => c.imageUrl).filter((u): u is string => !!u),
    ];
    await Promise.all(urls.map((u) => deleteImage(u)));
  }
}
