import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/cache";
import { FLASH_SALE_ACTIVE_CACHE_KEY } from "./cache";

const CATALOG_TTL_SECONDS = 60;

// Mirrors the catalog card shape in server/products/index.ts — keep the two in
// step so a campaign card renders identically to the same product elsewhere.
const productWithImages = {
  images: { orderBy: { sortOrder: "asc" as const } },
  // Backs the card's "from" price and its colour for variant products. A
  // campaign salePrice still overrides this (see the homepage mapping).
  variants: {
    orderBy: { sortOrder: "asc" as const },
    select: { price: true, discountPrice: true, priceColor: true },
  },
  // Lets storefront cards decide quick-add vs. "View Details" (see ProductCard).
  _count: { select: { variants: true, colors: true } },
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
