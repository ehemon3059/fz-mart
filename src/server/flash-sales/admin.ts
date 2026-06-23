import { prisma } from "@/lib/prisma";
import { invalidateFlashSaleCache } from "./cache";

export async function listAllFlashSales() {
  return prisma.flashSale.findMany({
    orderBy: { startsAt: "desc" },
    include: { products: true },
  });
}

export async function getFlashSaleById(id: number) {
  return prisma.flashSale.findUnique({
    where: { id },
    include: {
      products: {
        orderBy: { sortOrder: "asc" },
        include: { product: true },
      },
    },
  });
}

export interface FlashSaleProductInput {
  productId: number;
  /** Paisa, or null/undefined to use the product's own discountPrice. */
  salePrice?: number | null;
}

export interface FlashSaleInput {
  name: string;
  startsAt: Date;
  endsAt: Date;
  isActive?: boolean;
  products: FlashSaleProductInput[];
}

export async function createFlashSale(input: FlashSaleInput) {
  const flashSale = await prisma.flashSale.create({
    data: {
      name: input.name,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      isActive: input.isActive ?? true,
      products: {
        createMany: {
          data: input.products.map((p, i) => ({
            productId: p.productId,
            salePrice: p.salePrice ?? null,
            sortOrder: i,
          })),
        },
      },
    },
  });
  await invalidateFlashSaleCache();
  return flashSale;
}

export async function updateFlashSale(id: number, input: FlashSaleInput) {
  const flashSale = await prisma.$transaction(async (tx) => {
    const updated = await tx.flashSale.update({
      where: { id },
      data: {
        name: input.name,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        isActive: input.isActive ?? true,
      },
    });

    await tx.flashSaleProduct.deleteMany({ where: { flashSaleId: id } });
    if (input.products.length > 0) {
      await tx.flashSaleProduct.createMany({
        data: input.products.map((p, i) => ({
          flashSaleId: id,
          productId: p.productId,
          salePrice: p.salePrice ?? null,
          sortOrder: i,
        })),
      });
    }

    return updated;
  });

  await invalidateFlashSaleCache();
  return flashSale;
}

export async function deleteFlashSale(id: number) {
  await prisma.flashSale.delete({ where: { id } });
  await invalidateFlashSaleCache();
}
