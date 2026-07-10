import "server-only";
import { headers } from "next/headers";
import type { FunnelEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { getClientIp } from "@/lib/client-ip";
import { isIpBlocked } from "@/lib/ip-block";
import { isBotUserAgent } from "@/lib/bot-detection";
import { getCurrentCustomer } from "@/lib/customer-session";
import { generateCustomerId } from "@/lib/customer-id";

// Server-side storefront funnel tracking. Recorded where each action already
// happens (product view, add-to-cart, checkout start, order placed) so the
// admin sees conversion rates in-house — not only outbound pixel events.
//
// INVARIANT: recording NEVER blocks or fails the user-facing action. Every
// public entry point is fire-and-forget (void + internal catch); a tracking
// failure is logged and swallowed. Blocked IPs and obvious bots are filtered
// before any write so the funnel reflects real shoppers.
//
// sessionId is the identified customer id when signed in, else an ephemeral id
// (no new cookie is introduced, per design). It's coarse: its only structural
// use is the per-session/product/day debounce on PRODUCT_VIEW, done in Redis.

interface RecordOptions {
  /** Overrides the resolved sessionId (used by createOrder, which already
   *  knows the customer). */
  sessionId?: string | null;
  productId?: number | null;
  /**
   * When set, a PRODUCT_VIEW is written at most once per (sessionId, productId)
   * per this many seconds — keeps a refresh-spamming tab from inflating views.
   */
  dedupeSeconds?: number;
}

/**
 * Fire-and-forget funnel event. Resolves the session, applies IP-block + bot
 * filtering, then inserts a row. Safe to call without awaiting; any error is
 * caught and logged. Returns nothing.
 */
export function trackFunnelEvent(type: FunnelEventType, opts: RecordOptions = {}): void {
  void recordFunnelEvent(type, opts).catch((err) =>
    console.error(`[funnel] failed to record ${type} (non-blocking):`, err),
  );
}

async function recordFunnelEvent(type: FunnelEventType, opts: RecordOptions): Promise<void> {
  // 1. Drop blocked IPs and obvious bots so they never enter the funnel.
  const ua = await safeUserAgent();
  if (isBotUserAgent(ua)) return;

  const ip = await getClientIp();
  if (ip && (await isIpBlocked(ip))) return;

  // 2. Resolve the session id (identified customer, caller override, or a
  //    throwaway id — never mints a cookie).
  const sessionId =
    opts.sessionId?.trim() ||
    (await getCurrentCustomer())?.customerId ||
    generateCustomerId();

  // 3. Per-session/product/day debounce for views (Redis; fail-open on error).
  if (opts.dedupeSeconds && opts.dedupeSeconds > 0) {
    const key = `funnel:seen:${type}:${sessionId}:${opts.productId ?? "_"}`;
    try {
      // NX+EX: the first call sets the key and returns OK; repeats within the
      // window return null → skip. A Redis hiccup falls through to recording.
      const set = await redis.set(key, "1", "EX", opts.dedupeSeconds, "NX");
      if (set === null) return;
    } catch {
      // fail open — better to over-count slightly than lose the event
    }
  }

  await prisma.funnelEvent.create({
    data: { type, sessionId, productId: opts.productId ?? null },
  });
}

async function safeUserAgent(): Promise<string | null> {
  try {
    return (await headers()).get("user-agent");
  } catch {
    return null;
  }
}

// Reporting + retention live in ./report (kept free of next/headers so the
// standalone worker can import the prune). Re-exported here so callers can keep
// importing everything funnel-related from "@/server/funnel".
export {
  getFunnelReport,
  pruneFunnelEvents,
  type FunnelReport,
  type FunnelStep,
} from "./report";
