import bcrypt from "bcrypt";
import Redis from "ioredis";
import { loadEnv } from "./helpers/env";
import { prisma, E2E_PRODUCTS, E2E_ADMIN } from "./helpers/db";

// Provisions everything the specs rely on, idempotently:
//   - a dedicated admin user (separate from the seeded "admin" account),
//   - shipping zone 1 (same upsert the seed uses, so they can coexist),
//   - three e2e products with known stock, reset on every run,
//   - cleared checkout/login rate-limit counters, so repeated local runs
//     don't trip the per-IP limits and fail for the wrong reason.

async function clearRateLimits(): Promise<void> {
  const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 1,
  });
  try {
    const keys = await redis.keys("ratelimit:checkout:*");
    const loginKeys = await redis.keys("ratelimit:login:*");
    const all = [...keys, ...loginKeys];
    if (all.length > 0) await redis.del(...all);
  } finally {
    redis.disconnect();
  }
}

export default async function globalSetup(): Promise<void> {
  loadEnv();

  const passwordHash = await bcrypt.hash(E2E_ADMIN.password, 12);
  await prisma.adminUser.upsert({
    where: { username: E2E_ADMIN.username },
    update: { passwordHash },
    create: {
      username: E2E_ADMIN.username,
      email: "e2e-admin@example.com",
      passwordHash,
      role: "OWNER",
    },
  });

  await prisma.shippingZone.upsert({
    where: { id: 1 },
    update: { isActive: true },
    create: { id: 1, name: "Inside Dhaka", charge: 6000, sortOrder: 0 },
  });

  const category = await prisma.category.upsert({
    where: { slug: "e2e-tests" },
    update: {},
    create: { name: "E2E Tests", slug: "e2e-tests", sortOrder: 99 },
  });
  const subcategory = await prisma.subcategory.upsert({
    where: { slug: "e2e-tests-sub" },
    update: {},
    create: {
      name: "E2E Tests Sub",
      slug: "e2e-tests-sub",
      categoryId: category.id,
      sortOrder: 99,
    },
  });

  const products = [
    { slug: E2E_PRODUCTS.checkout, name: "E2E Checkout Product", price: 150000, stock: 50 },
    { slug: E2E_PRODUCTS.buyNow, name: "E2E Buy Now Product", price: 80000, stock: 50 },
    // Exactly one unit — the oversell spec races two checkouts for it.
    { slug: E2E_PRODUCTS.oversell, name: "E2E Oversell Product", price: 99900, stock: 1 },
  ];
  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: { stock: p.stock, price: p.price, status: "ACTIVE" },
      create: {
        ...p,
        description: "Automated test product — safe to delete.",
        subcategoryId: subcategory.id,
      },
    });
    const imageCount = await prisma.productImage.count({ where: { productId: product.id } });
    if (imageCount === 0) {
      await prisma.productImage.create({
        data: { productId: product.id, url: "/placeholder.svg", isPrimary: true, sortOrder: 0 },
      });
    }
  }

  // Online payments via the MOCK provider only — exercises the whole
  // PENDING_PAYMENT → verify → paid pipeline without any real gateway.
  const paymentSettings: Array<[string, string]> = [
    ["onlineEnabled", "true"],
    ["partialEnabled", "true"],
    ["mockEnabled", "true"],
    ["mockFeeBps", "250"], // 2.5% — asserts the P&L fee capture
    ["sslcommerzEnabled", "false"],
    ["bkashEnabled", "false"],
  ];
  for (const [key, value] of paymentSettings) {
    await prisma.setting.upsert({
      where: { group_key: { group: "payments", key } },
      update: { value, isEncrypted: false },
      create: { group: "payments", key, value, isEncrypted: false },
    });
  }

  // A fixed-amount coupon for the coupon checkout spec (idempotent).
  await prisma.coupon.upsert({
    where: { code: "E2E100" },
    update: { isActive: true, type: "FIXED", value: 10000, minOrder: 0 },
    create: { code: "E2E100", type: "FIXED", value: 10000, minOrder: 0, isActive: true },
  });

  await clearRateLimits();
  await prisma.$disconnect();
}
