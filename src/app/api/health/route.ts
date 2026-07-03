import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

// Liveness/readiness probe for uptime monitoring (UptimeRobot etc.). Checks
// the two hard dependencies — MySQL and Redis — and returns 200 only when both
// answer. A failing check returns 503 so the monitor alerts.
export const dynamic = "force-dynamic";

async function check(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const [db, cache] = await Promise.all([
    check(() => prisma.$queryRaw`SELECT 1`),
    check(() => redis.ping()),
  ]);

  const ok = db && cache;
  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      checks: { database: db ? "up" : "down", redis: cache ? "up" : "down" },
      timestamp: new Date().toISOString(),
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
