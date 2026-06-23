import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/cache";
import { FLASH_SALE_ACTIVE_CACHE_KEY } from "./cache";

const CATALOG_TTL_SECONDS = 60;

const productWithImages = {
  images: { orderBy: { sortOrder: "asc" as const } },
};

// Returns the single currently-running campaign (isActive AND now within
// [startsAt, endsAt]), or null. Storefront only ever needs one at a time.
export async function getActiveFlashSale() {
  return getOrSetCache(FLASH_SALE_ACTIVE_CACHE_KEY, CATALOG_TTL_SECONDS, async () => {
    const now = new Date();
    return prisma.flashSale.findFirst({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      orderBy: { endsAt: "asc" },
      include: {
        products: {
          orderBy: { sortOrder: "asc" },
          include: { product: { include: productWithImages } },
        },
      },
    });
  });
}

export type ActiveFlashSale = NonNullable<
  Awaited<ReturnType<typeof getActiveFlashSale>>
>;
