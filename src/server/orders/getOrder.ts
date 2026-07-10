import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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

export async function getOrderByOrderNo(orderNo: string) {
  return prisma.order.findUnique({
    where: { orderNo },
    include: { items: true, shippingZone: true },
  });
}

/** Public tracking: orderNo + phone as a light identity check. */
export async function trackOrder(orderNo: string, phone: string) {
  return prisma.order.findFirst({
    where: { orderNo, customerPhone: phone },
    include: { items: true, shippingZone: true },
  });
}
