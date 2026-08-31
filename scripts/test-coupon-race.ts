/**
 * Concurrency test for coupon redemption limits. DESTRUCTIVE — local only.
 *
 * Fires N concurrent checkouts against one coupon whose usageLimit is 5 and
 * asserts that EXACTLY 5 succeed. Before src/server/coupons/index.ts enforced
 * the limits under a row lock, the per-customer check was a plain count() on a
 * pinned REPEATABLE READ snapshot, so every concurrent order read "used = 0"
 * and passed. This script is the regression proof.
 *
 * It calls createOrder() directly rather than driving HTTP, because createOrder
 * IS the transaction under test — going through the route would add Next.js
 * request handling and obscure the race we care about.
 *
 * Fixtures are created up front and torn down at the end, so the script leaves
 * the database as it found it even when an assertion fails.
 *
 *   npx tsx --env-file=.env.test scripts/test-coupon-race.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../src/lib/prisma";
import { createOrder, CheckoutError } from "../src/server/orders/createOrder";
import { CouponError } from "../src/server/coupons";

// ── Safety ──────────────────────────────────────────────────────────────────
// Same rule as scripts/test-db.mjs and tests/e2e/helpers/guard.ts: this script
// creates orders and burns coupon redemptions, so it must never touch a hosted
// or production database.

const HOSTED_HOST_PATTERNS = [
  "tidbcloud.com",
  "planetscale",
  "rds.amazonaws.com",
  "azure.com",
  "digitalocean.com",
  "aivencloud.com",
  "scalegrid",
  "clever-cloud.com",
];
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "host.docker.internal"]);

function die(lines: string[]): never {
  console.error(["", ...lines.map((l) => `  ${l}`), ""].join("\n"));
  process.exit(1);
}

function assertLocalDatabase(): void {
  const url = process.env.DATABASE_URL;
  if (!url) {
    die([
      "REFUSING to run: DATABASE_URL is not set.",
      "Run with: npx tsx --env-file=.env.test scripts/test-coupon-race.ts",
    ]);
  }

  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    die(["REFUSING to run: DATABASE_URL is not a parseable connection string."]);
  }

  const hosted = HOSTED_HOST_PATTERNS.find((p) => host.includes(p));
  if (hosted) {
    die([
      `REFUSING to run: DATABASE_URL points at a hosted provider (${hosted}).`,
      `Host: ${host}`,
      "",
      "This script creates real orders and consumes coupon redemptions.",
    ]);
  }
  if (!LOCAL_HOSTS.has(host)) {
    die([
      "REFUSING to run: DATABASE_URL is not a local host.",
      `Host: ${host} - expected localhost or 127.0.0.1.`,
    ]);
  }

  // Belt and braces: even a "local" URL must not be the one in .env.
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    const m = /^\s*DATABASE_URL\s*=\s*(.*)\s*$/m.exec(raw);
    const productionUrl = m?.[1].trim().replace(/^["']|["']$/g, "");
    if (productionUrl && productionUrl === url) {
      die([
        "REFUSING to run: DATABASE_URL is identical to the one in .env.",
        "Point .env.test at a separate throwaway database.",
      ]);
    }
  } catch {
    // No .env at all is fine.
  }
}

// ── Test parameters ─────────────────────────────────────────────────────────

const CONCURRENCY = 20;
const USAGE_LIMIT = 5;
const UNIT_PRICE = 50_000; // paisa
const COUPON_CODE = `RACETEST${Date.now().toString().slice(-6)}`;
const SUFFIX = Date.now().toString().slice(-8);

interface Fixtures {
  categoryId: number;
  productId: number;
  couponId: number;
  zoneId: number;
  divisionId: number;
  districtId: number;
}

async function seed(): Promise<Fixtures> {
  const zone = await prisma.shippingZone.create({
    data: { name: `Race Test Zone ${SUFFIX}`, charge: 6000, isActive: true },
  });
  const division = await prisma.division.create({
    data: { name: `Race Div ${SUFFIX}`, slug: `race-div-${SUFFIX}`, shippingZoneId: zone.id },
  });
  const district = await prisma.district.create({
    data: {
      divisionId: division.id,
      name: `Race Dist ${SUFFIX}`,
      slug: `race-dist-${SUFFIX}`,
      shippingZoneId: zone.id,
    },
  });
  const category = await prisma.category.create({
    data: { name: `Race Cat ${SUFFIX}`, slug: `race-cat-${SUFFIX}` },
  });
  // Stock far above CONCURRENCY so the reservation guard can never be the
  // reason an order fails - the coupon must be the only limiting factor.
  const product = await prisma.product.create({
    data: {
      categoryId: category.id,
      name: `Race Product ${SUFFIX}`,
      slug: `race-product-${SUFFIX}`,
      price: UNIT_PRICE,
      purchaseCost: 10_000,
      stock: CONCURRENCY * 10,
      status: "ACTIVE",
    },
  });
  const coupon = await prisma.coupon.create({
    data: {
      code: COUPON_CODE,
      type: "FIXED",
      value: 10_000,
      usageLimit: USAGE_LIMIT,
      // Left null on purpose: every checkout in race A uses a DISTINCT phone,
      // so that run isolates the TOTAL usage limit. The per-customer limit gets
      // its own run in racePerCustomer().
      perCustomerLimit: null,
      isActive: true,
    },
  });

  return {
    categoryId: category.id,
    productId: product.id,
    couponId: coupon.id,
    zoneId: zone.id,
    divisionId: division.id,
    districtId: district.id,
  };
}

async function teardown(f: Fixtures | null): Promise<void> {
  if (!f) return;
  // Orders first (CouponRedemption and OrderItem cascade from Order).
  await prisma.order.deleteMany({ where: { items: { some: { productId: f.productId } } } });
  await prisma.couponRedemption.deleteMany({ where: { couponId: f.couponId } });
  await prisma.coupon.deleteMany({ where: { id: f.couponId } });
  await prisma.product.deleteMany({ where: { id: f.productId } });
  await prisma.category.deleteMany({ where: { id: f.categoryId } });
  await prisma.district.deleteMany({ where: { id: f.districtId } });
  await prisma.division.deleteMany({ where: { id: f.divisionId } });
  await prisma.shippingZone.deleteMany({ where: { id: f.zoneId } });
}

/** One checkout attempt. Distinguishes "the coupon said no" from a real crash. */
type Attempt =
  | { ok: true; orderNo: string; total: number }
  | { ok: false; rejected: true; reason: string }
  | { ok: false; rejected: false; error: unknown };

async function attemptCheckout(f: Fixtures, phone: string, i: number): Promise<Attempt> {
  try {
    const order = await createOrder({
      customerName: `Race Buyer ${i}`,
      customerPhone: phone,
      address: "1 Race Condition Road",
      divisionId: f.divisionId,
      districtId: f.districtId,
      upazilaId: null,
      items: [{ productId: f.productId, quantity: 1 }],
      paymentMethod: "COD",
      couponCode: COUPON_CODE,
    });
    return { ok: true, orderNo: order.orderNo, total: order.total };
  } catch (err) {
    if (err instanceof CouponError || err instanceof CheckoutError) {
      return { ok: false, rejected: true, reason: err.message };
    }
    return { ok: false, rejected: false, error: err };
  }
}

// Bangladeshi mobile format, one distinct number per concurrent buyer.
const phoneFor = (i: number) => `017${String(10_000_000 + i).slice(-8)}`;

interface Outcome {
  succeeded: number;
  rejected: number;
  crashed: Attempt[];
  reasons: Map<string, number>;
}

function summarise(results: Attempt[]): Outcome {
  const reasons = new Map<string, number>();
  let succeeded = 0;
  let rejected = 0;
  const crashed: Attempt[] = [];
  for (const r of results) {
    if (r.ok) {
      succeeded++;
    } else if (r.rejected) {
      rejected++;
      reasons.set(r.reason, (reasons.get(r.reason) ?? 0) + 1);
    } else {
      crashed.push(r);
    }
  }
  return { succeeded, rejected, crashed, reasons };
}

const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown): void {
  const pass = actual === expected;
  console.log(
    `  ${pass ? "PASS" : "FAIL"}  ${label.padEnd(46)} expected ${String(expected)}, got ${String(actual)}`,
  );
  if (!pass) failures.push(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

/** 20 concurrent checkouts, distinct phones, usageLimit = 5. */
async function raceTotalLimit(f: Fixtures): Promise<void> {
  console.log(`\n  Race A - total usage limit (${CONCURRENCY} concurrent, limit ${USAGE_LIMIT})\n`);

  // Promise.all fires them without awaiting in between; they contend inside the
  // database, which is where the race lives.
  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, i) => attemptCheckout(f, phoneFor(i), i)),
  );
  const outcome = summarise(results);

  for (const [reason, n] of outcome.reasons) console.log(`        ${n}x rejected: ${reason}`);
  for (const c of outcome.crashed) console.error("        UNEXPECTED ERROR:", c);
  console.log("");

  check("orders created", outcome.succeeded, USAGE_LIMIT);
  check("checkouts rejected", outcome.rejected, CONCURRENCY - USAGE_LIMIT);
  check("unexpected crashes", outcome.crashed.length, 0);

  // The counter and the redemption rows must agree with the orders. A counter
  // that ran ahead of the rows means an increment escaped its rollback.
  const coupon = await prisma.coupon.findUniqueOrThrow({ where: { id: f.couponId } });
  const redemptions = await prisma.couponRedemption.count({ where: { couponId: f.couponId } });
  const orders = await prisma.order.count({ where: { couponCode: COUPON_CODE } });

  check("coupon.timesUsed", coupon.timesUsed, USAGE_LIMIT);
  check("CouponRedemption rows", redemptions, USAGE_LIMIT);
  check("orders carrying the coupon", orders, USAGE_LIMIT);

  // Every surviving order must actually be discounted; a rolled-back redemption
  // must not leave an order behind at the undiscounted price.
  const discounted = await prisma.order.count({
    where: { couponCode: COUPON_CODE, couponDiscount: { gt: 0 } },
  });
  check("orders with a discount applied", discounted, USAGE_LIMIT);
}

/** Same coupon, one phone, perCustomerLimit = 1. */
async function racePerCustomer(f: Fixtures): Promise<void> {
  const PER_CUSTOMER = 1;
  console.log(
    `\n  Race B - per-customer limit (${CONCURRENCY} concurrent, one phone, limit ${PER_CUSTOMER})\n`,
  );

  // Reset the coupon: unlimited total, so only the per-customer rule can bite.
  await prisma.order.deleteMany({ where: { couponCode: COUPON_CODE } });
  await prisma.couponRedemption.deleteMany({ where: { couponId: f.couponId } });
  await prisma.coupon.update({
    where: { id: f.couponId },
    data: { timesUsed: 0, usageLimit: null, perCustomerLimit: PER_CUSTOMER },
  });

  const phone = phoneFor(999);
  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, i) => attemptCheckout(f, phone, i)),
  );
  const outcome = summarise(results);

  for (const [reason, n] of outcome.reasons) console.log(`        ${n}x rejected: ${reason}`);
  for (const c of outcome.crashed) console.error("        UNEXPECTED ERROR:", c);
  console.log("");

  check("orders created (one phone)", outcome.succeeded, PER_CUSTOMER);
  check("unexpected crashes", outcome.crashed.length, 0);

  const redemptions = await prisma.couponRedemption.count({
    where: { couponId: f.couponId, customerPhone: phone },
  });
  check("CouponRedemption rows for that phone", redemptions, PER_CUSTOMER);

  // The rejected attempts rolled back, so timesUsed must not have run ahead of
  // the rows it counts.
  const coupon = await prisma.coupon.findUniqueOrThrow({ where: { id: f.couponId } });
  check("coupon.timesUsed matches rows", coupon.timesUsed, PER_CUSTOMER);
}

async function main(): Promise<void> {
  assertLocalDatabase();

  const host = new URL(process.env.DATABASE_URL!).hostname;
  console.log(`\n  Coupon race test  (db: ${host}, coupon: ${COUPON_CODE})`);

  let fixtures: Fixtures | null = null;
  try {
    fixtures = await seed();
    await raceTotalLimit(fixtures);
    await racePerCustomer(fixtures);
  } finally {
    await teardown(fixtures);
    console.log("\n  Fixtures removed.");
  }

  if (failures.length > 0) {
    console.error(`\n  ${failures.length} assertion(s) FAILED:\n`);
    for (const f of failures) console.error(`    - ${f}`);
    console.error("\n  Coupon limits are NOT holding under concurrency.\n");
    process.exitCode = 1;
  } else {
    console.log("\n  All assertions passed - coupon limits hold under concurrency.\n");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
