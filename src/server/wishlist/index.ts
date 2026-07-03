import { prisma } from "@/lib/prisma";

// Customer wishlist. Keyed by (customerId, productId) — one row per saved
// product, toggled on/off.

export async function toggleWishlist(customerId: string, productId: number): Promise<boolean> {
  const existing = await prisma.wishlistItem.findUnique({
    where: { customerId_productId: { customerId, productId } },
  });
  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return false; // now removed
  }
  await prisma.wishlistItem.create({ data: { customerId, productId } });
  return true; // now added
}

export async function isWishlisted(customerId: string, productId: number): Promise<boolean> {
  const row = await prisma.wishlistItem.findUnique({
    where: { customerId_productId: { customerId, productId } },
  });
  return row != null;
}

export async function listWishlist(customerId: string) {
  const items = await prisma.wishlistItem.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          discountPrice: true,
          stock: true,
          promoBadge: true,
          status: true,
          images: { orderBy: { sortOrder: "asc" }, select: { url: true, isPrimary: true } },
        },
      },
    },
  });
  // Only surface products still active.
  return items.filter((i) => i.product.status === "ACTIVE").map((i) => i.product);
}
