import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redis } from "@/lib/redis";
import { secureCookieOptions } from "@/lib/cookie-security";

/*
 * Proof that the bearer just placed (or paid for) a specific order.
 *
 * THE PROBLEM THIS SOLVES (A2-01/A2-02). The order-confirmation page is
 * reachable by anyone who knows an orderNo, and orderNo is six digits — a 1e6
 * keyspace, enumerable in hours. The page rendered the customer's name, phone,
 * line items and total, and handed that phone to <CustomerOrderActions>, where
 * it is the SOLE ownership secret for cancel/return. So guessing a number both
 * disclosed a stranger's PII and yielded the credential to cancel their order.
 *
 * WHY A GRANT AND NOT A LOGIN. Most orders here are guest COD checkouts: there
 * is no account to authenticate against, and demanding one at the moment of
 * "Order Placed!" would cost real sales. What the legitimate buyer provably has
 * that an enumerating attacker does not is a *response to the request that
 * created the order*. We issue a grant on that response and require it on the
 * way back in.
 *
 * SHAPE — deliberately the same as our sessions (see SD-001 in
 * docs/security-decisions.md). The cookie holds an opaque 256-bit random id and
 * NOTHING ELSE: no orderNo, no phone, no expiry the server trusts. The mapping
 * grant -> orderNo lives in Redis. A forged cookie is not rejected by a
 * signature check; it is rejected because there is nothing on the server to
 * find. This keeps us clear of SD-001's reversal trigger, which voids that
 * decision the moment a cookie carries its own claims.
 *
 * A grant is therefore:
 *   - unguessable   randomBytes(32), same CSPRNG as our session ids;
 *   - scoped        it authorises exactly the orders in its own set, no others;
 *   - short-lived   GRANT_TTL below, not the lifetime of the order;
 *   - not a session it proves "I placed this order", never "I am this person".
 *     It must never be accepted anywhere that a customer session is required.
 */

/**
 * How long a grant stays valid.
 *
 * Two hours, not two weeks. The legitimate use is immediate — read the
 * confirmation, maybe cancel within the hour. A signed-in customer revisiting
 * an old order goes through /account/orders, which re-authorises from the
 * session on every visit and needs no grant at all. A guest returning days
 * later goes through /track, which requires orderNo AND phone and is rate
 * limited. Neither real path depends on a long-lived grant, so a short TTL
 * costs nothing and bounds the value of a stolen cookie.
 */
const GRANT_TTL_SECONDS = 60 * 60 * 2;

/**
 * Cap on orders per grant. A browser that places several orders keeps access to
 * all of them, but the set cannot grow without bound — and, more to the point,
 * a single grant can never accumulate enough scope to become an enumeration
 * oracle in its own right. Oldest entries fall out first.
 */
const MAX_ORDERS_PER_GRANT = 20;

export const ORDER_GRANT_COOKIE = "fz_order_grant";

const grantKey = (grantId: string) => `order_grant:${grantId}`;

/** Reject anything that isn't the exact shape we mint, before it touches Redis. */
function isWellFormedGrantId(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

/**
 * Authorise the current browser for `orderNo`, reusing the existing grant when
 * there is one so a repeat buyer doesn't lose access to their earlier orders.
 *
 * Never throws. This is called at the very end of checkout, AFTER the order is
 * committed — the sale is already made, and failing the request at that point
 * would show an error for an order that genuinely exists. A Redis blip here
 * degrades to "the confirmation page asks you to look the order up on /track",
 * which is recoverable; throwing would not be.
 */
export async function grantOrderAccess(orderNo: string): Promise<void> {
  try {
    const jar = await cookies();
    const existing = jar.get(ORDER_GRANT_COOKIE)?.value;

    let grantId: string;
    if (existing && isWellFormedGrantId(existing) && (await redis.exists(grantKey(existing)))) {
      grantId = existing;
    } else {
      grantId = randomBytes(32).toString("hex");
    }

    const key = grantKey(grantId);
    await redis
      .multi()
      .sadd(key, orderNo)
      // Refresh on every grant so an active buyer's set doesn't expire
      // mid-checkout, while an idle one still ages out on schedule.
      .expire(key, GRANT_TTL_SECONDS)
      .exec();

    // Trim from the tail if this browser has been busy. SPOP removes arbitrary
    // members, which is fine: any survivor is still a genuinely placed order,
    // and the bound is what matters, not which entries win.
    const size = await redis.scard(key);
    if (size > MAX_ORDERS_PER_GRANT) {
      await redis.spop(key, size - MAX_ORDERS_PER_GRANT);
    }

    jar.set(ORDER_GRANT_COOKIE, grantId, {
      ...(await secureCookieOptions()),
      maxAge: GRANT_TTL_SECONDS,
    });
  } catch (err) {
    console.error("[order-access] failed to issue grant:", (err as Error).message);
  }
}

/**
 * Whether this browser holds a grant for `orderNo`.
 *
 * FAILS CLOSED. A Redis outage returns false, and the caller must then fall
 * back to another form of authorisation (a customer session) or refuse. The
 * alternative — treating "can't check" as "allowed" — would restore exactly the
 * enumeration hole this module exists to close, and would do it precisely when
 * we're least able to observe it.
 */
export async function hasOrderAccess(orderNo: string): Promise<boolean> {
  try {
    const grantId = (await cookies()).get(ORDER_GRANT_COOKIE)?.value;
    if (!grantId || !isWellFormedGrantId(grantId)) return false;
    return (await redis.sismember(grantKey(grantId), orderNo)) === 1;
  } catch (err) {
    console.error("[order-access] grant check failed, denying:", (err as Error).message);
    return false;
  }
}
