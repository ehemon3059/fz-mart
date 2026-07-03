import { PrismaClient } from "@prisma/client";

// One shared Prisma client for test setup and DB-level assertions. E2E tests
// verify money-critical outcomes (order rows, stock counts) directly in the
// database, not just what the UI happens to render.

export const prisma = new PrismaClient();

/** Slugs of the products global-setup provisions for the specs. */
export const E2E_PRODUCTS = {
  checkout: "e2e-checkout-product",
  buyNow: "e2e-buynow-product",
  oversell: "e2e-oversell-product",
} as const;

export const E2E_ADMIN = {
  username: "e2e-admin",
  password: "e2e-admin-password-1",
} as const;

/** Valid, unique Bangladeshi mobile number per call — keeps per-phone rate limits out of the way. */
export function uniquePhone(): string {
  return `017${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) throw new Error(`E2E product missing: ${slug} — did global setup run?`);
  return product;
}

/** Creates a PENDING order directly (bypassing checkout) for admin-flow tests. */
export async function createPendingOrder(productSlug: string) {
  const product = await getProductBySlug(productSlug);
  const unitPrice = product.discountPrice ?? product.price;
  return prisma.order.create({
    data: {
      orderNo: `E2E${Date.now()}${Math.floor(Math.random() * 1000)}`,
      customerName: "E2E Admin Flow",
      customerPhone: uniquePhone(),
      address: "E2E test address, Dhaka",
      shippingZoneId: 1,
      deliveryCharge: 6000,
      subtotal: unitPrice,
      total: unitPrice + 6000,
      status: "PENDING",
      items: {
        create: {
          productId: product.id,
          productName: product.name,
          unitPrice,
          purchaseCost: product.purchaseCost,
          quantity: 1,
        },
      },
      statusLogs: { create: { toStatus: "PENDING", changedBy: null } },
    },
  });
}
