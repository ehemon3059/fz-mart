import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { checkPhone, type FraudCheckData } from "@/integrations/fraud";
import { rateLimit } from "@/lib/rate-limit";

// Rate-limits the underlying PAID API call specifically — distinct from the
// 24h Redis/DB cache above. The cache already prevents repeat calls for a
// phone with a known result, but this guards the call itself (e.g. a bug
// that bypasses the cache, or a burst of first-time phones) so a spike in
// checkout traffic can't translate into an uncapped API bill.
const FRAUD_API_LIMIT = 20;
const FRAUD_API_WINDOW_SECONDS = 60;

// Fraud lookups cost money/time per call, so results are cached per phone
// number in TWO layers: Redis (fast, short-lived) and FraudCheckResult in
// the DB (durable, used to seed Redis again after a cache flush, and to
// show history in the admin UI).
//
// Trigger point: checkout, for COD orders only (see server/orders/createOrder
// call site) — this is the one deliberate trigger point per the guide,
// rather than leaving it ambiguous (e.g. also checking on every admin page
// view, which would multiply API cost for no benefit).

const REDIS_TTL_SECONDS = 60 * 60 * 24; // 24h — balances cost vs staleness
const REDIS_KEY_PREFIX = "fraud_check:";

export interface FraudResult extends FraudCheckData {
  checkedAt: Date;
}

function cacheKey(phone: string): string {
  return `${REDIS_KEY_PREFIX}${phone}`;
}

export async function getFraudCheck(phone: string): Promise<FraudResult> {
  const cached = await redis.get(cacheKey(phone));
  if (cached) {
    return JSON.parse(cached) as FraudResult;
  }

  // Not in Redis — check the DB before calling the paid API again. A DB row
  // surviving a Redis flush is exactly the "don't pay twice" case.
  const dbRow = await prisma.fraudCheckResult.findUnique({ where: { phone } });
  if (dbRow) {
    const result: FraudResult = {
      totalOrders: dbRow.totalOrders,
      successOrders: dbRow.successOrders,
      returnOrders: dbRow.returnOrders,
      riskScore: dbRow.riskScore,
      checkedAt: dbRow.checkedAt,
    };
    await redis.set(cacheKey(phone), JSON.stringify(result), "EX", REDIS_TTL_SECONDS);
    return result;
  }

  const limit = await rateLimit("fraud:api", "global", FRAUD_API_LIMIT, FRAUD_API_WINDOW_SECONDS);
  if (!limit.allowed) {
    throw new Error("Fraud API rate limit exceeded — too many checks in the last minute.");
  }

  const data = await checkPhone(phone);
  const checkedAt = new Date();

  await prisma.fraudCheckResult.upsert({
    where: { phone },
    create: { phone, ...data, checkedAt },
    update: { ...data, checkedAt },
  });

  const result: FraudResult = { ...data, checkedAt };
  await redis.set(cacheKey(phone), JSON.stringify(result), "EX", REDIS_TTL_SECONDS);
  return result;
}

export function riskLabel(score: number): "low" | "medium" | "high" {
  if (score >= 70) return "high";
  if (score >= 30) return "medium";
  return "low";
}

/**
 * Read-only lookup for admin UI — never calls the paid API. Checkout is the
 * single trigger point (see getFraudCheck); viewing an order must not cost
 * money just because staff opened the page.
 */
export async function getExistingFraudCheck(phone: string): Promise<FraudResult | null> {
  const dbRow = await prisma.fraudCheckResult.findUnique({ where: { phone } });
  if (!dbRow) return null;
  return {
    totalOrders: dbRow.totalOrders,
    successOrders: dbRow.successOrders,
    returnOrders: dbRow.returnOrders,
    riskScore: dbRow.riskScore,
    checkedAt: dbRow.checkedAt,
  };
}

/** Batch version for list views — one query instead of N+1 per row. */
export async function getExistingFraudChecksByPhones(
  phones: string[],
): Promise<Map<string, number>> {
  if (phones.length === 0) return new Map();
  const rows = await prisma.fraudCheckResult.findMany({
    where: { phone: { in: phones } },
    select: { phone: true, riskScore: true },
  });
  return new Map(rows.map((r) => [r.phone, r.riskScore]));
}
