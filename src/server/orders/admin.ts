import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nextStatuses } from "@/config/order-status";

export async function listOrders(filter?: { status?: OrderStatus }) {
  return prisma.order.findMany({
    where: filter?.status ? { status: filter.status } : undefined,
    orderBy: { createdAt: "desc" },
    include: { items: true, shippingZone: true },
  });
}

export async function getOrderById(id: number) {
  return prisma.order.findUnique({
    where: { id },
    include: { items: true, shippingZone: true, courierShipment: true },
  });
}

export class InvalidTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTransitionError";
  }
}

/**
 * Advance an order's status, validated against the state machine in
 * config/order-status.ts. Admin can't jump arbitrarily (e.g. PENDING straight
 * to DELIVERED) — only to a status reachable from the current one.
 */
export async function updateOrderStatus(orderId: number, newStatus: OrderStatus) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new InvalidTransitionError("Order not found.");
  }

  const allowed = nextStatuses(order.status);
  if (!allowed.includes(newStatus)) {
    throw new InvalidTransitionError(
      `Cannot move order from ${order.status} to ${newStatus}.`,
    );
  }

  return prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus },
  });
}
