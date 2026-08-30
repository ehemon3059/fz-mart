import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasOrderAccess } from "@/lib/order-access";

/**
 * A signed-in customer's orders, newest first. Optionally filtered to a set of
 * statuses (e.g. DELIVERED for "purchase history"). Only orders placed while
 * signed in carry customerId (see Order.customerId), so guest checkouts never
 * show up here — by design, this is a benefit of being signed in.
 */
export async function listOrdersForCustomer(customerId: string, statuses?: OrderStatus[]) {
  return prisma.order.findMany({
    where: { customerId, ...(statuses ? { status: { in: statuses } } : {}) },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
}

/** Public tracking: orderNo + phone as a light identity check. */
export async function trackOrder(orderNo: string, phone: string) {
  return prisma.order.findFirst({
    where: { orderNo, customerPhone: phone },
    include: { items: true, shippingZone: true },
  });
}

/**
 * The order behind a confirmation page, or null when the caller may not see it.
 *
 * This is the A2-01 fix, and it REPLACED an exported `getOrderByOrderNo` that
 * took an orderNo and returned the order to anyone who asked. That function is
 * deleted rather than left unused: it answered "does this orderNo exist", which
 * is a question the confirmation page must never ask on behalf of an anonymous
 * visitor — six digits is enumerable, and the answer carried the customer's
 * name, phone, items and total. Leaving it exported would be an inviting name
 * for the next caller to reach for and reintroduce the hole.
 *
 * Two ways to be authorised, and NEITHER trusts the URL alone:
 *
 *   1. A signed-in customer reading their own order. `customerId` goes INSIDE
 *      the where clause (project rule: ownership filters are never a JS check
 *      after the fetch), so a non-matching order is not fetched at all.
 *
 *   2. A guest holding a grant issued when they placed it — see lib/order-access.
 *      Checked BEFORE the query so an unauthorised orderNo never reaches the DB.
 *
 * Returns null rather than throwing for the unauthorised case, so callers render
 * notFound(). A 404 for "exists but not yours" is deliberate: 403 would confirm
 * the number is real and hand an enumerator the oracle we just removed.
 */
export async function getOrderForViewer(
  orderNo: string,
  viewer: { customerId?: string | null },
) {
  if (viewer.customerId) {
    const owned = await prisma.order.findFirst({
      where: { orderNo, customerId: viewer.customerId },
      include: { items: true, shippingZone: true },
    });
    if (owned) return owned;
    // Fall through: a signed-in customer may still hold a guest grant for an
    // order placed before logging in (Order.customerId is only set when the
    // checkout happened while signed in).
  }

  if (!(await hasOrderAccess(orderNo))) return null;

  return prisma.order.findUnique({
    where: { orderNo },
    include: { items: true, shippingZone: true },
  });
}

/**
 * The phone recorded on an order, for a caller that has ALREADY proven access.
 *
 * Callers must check `hasOrderAccess` (or session ownership) first — this
 * function performs no authorisation of its own, which is why it returns only
 * the phone and nothing else. It exists so the self-service actions can stop
 * accepting a client-supplied phone (A2-02): the ownership secret is now read
 * from the row rather than asserted by the caller.
 */
export async function getOrderPhoneForViewer(orderNo: string): Promise<string | null> {
  const order = await prisma.order.findUnique({
    where: { orderNo },
    select: { customerPhone: true },
  });
  return order?.customerPhone ?? null;
}
