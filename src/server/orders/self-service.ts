import { prisma } from "@/lib/prisma";
import { restockOrderItems } from "@/server/payments";
import { getConversionConfig } from "@/server/settings/conversion";

// Customer self-service on their own orders. Authorization is knowledge-based
// (orderNo + the phone on the order) — the same model as guest order tracking,
// since most orders are guest COD. Every action re-verifies the phone.

export class SelfServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SelfServiceError";
  }
}

async function findOwnedOrder(orderNo: string, phone: string) {
  const order = await prisma.order.findUnique({
    where: { orderNo: orderNo.trim().toUpperCase() },
  });
  if (!order || order.customerPhone !== phone.trim()) {
    throw new SelfServiceError("We couldn't match that order to this phone number.");
  }
  return order;
}

/**
 * Cancel a still-PENDING order. Releases reserved stock and logs the change.
 * The customer's cancellation reason (a preset or free text) is stored on the
 * status-log `note` so the admin can see why on the order timeline.
 */
export async function cancelOwnOrder(
  orderNo: string,
  phone: string,
  reason?: string | null,
): Promise<void> {
  const order = await findOwnedOrder(orderNo, phone);
  if (order.status !== "PENDING") {
    throw new SelfServiceError("This order can no longer be cancelled — it's already being processed.");
  }

  const cleanReason = reason?.trim().slice(0, 500) || null;

  await prisma.$transaction(async (tx) => {
    // Guard against a race with an admin who just advanced the status.
    const fresh = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
    if (fresh.status !== "PENDING") {
      throw new SelfServiceError("This order can no longer be cancelled.");
    }
    await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    await tx.orderStatusLog.create({
      data: {
        orderId: order.id,
        fromStatus: "PENDING",
        toStatus: "CANCELLED",
        changedBy: "customer",
        note: cleanReason,
      },
    });
    await restockOrderItems(tx, order.id);
  });
}

/**
 * Open a return request against a DELIVERED order, within the configured
 * window. Creates a PENDING ReturnRequest for the admin queue; it does NOT
 * itself move the order to RETURNED (an admin approves that).
 */
export async function requestReturn(
  orderNo: string,
  phone: string,
  reason: string,
  photoUrl: string | null,
): Promise<void> {
  const order = await findOwnedOrder(orderNo, phone);
  if (order.status !== "DELIVERED") {
    throw new SelfServiceError("Returns can only be requested for delivered orders.");
  }

  const cleanReason = reason.trim();
  if (cleanReason.length < 5) {
    throw new SelfServiceError("Please describe the reason for your return.");
  }

  // Enforce the return window against the DELIVERED status-log timestamp.
  const config = await getConversionConfig();
  const deliveredLog = await prisma.orderStatusLog.findFirst({
    where: { orderId: order.id, toStatus: "DELIVERED" },
    orderBy: { createdAt: "desc" },
  });
  const deliveredAt = deliveredLog?.createdAt ?? order.updatedAt;
  const deadline = new Date(deliveredAt.getTime() + config.returnWindowDays * 24 * 60 * 60 * 1000);
  if (new Date() > deadline) {
    throw new SelfServiceError(
      `The ${config.returnWindowDays}-day return window for this order has passed.`,
    );
  }

  // One open request at a time.
  const existing = await prisma.returnRequest.findFirst({
    where: { orderId: order.id, status: "PENDING" },
  });
  if (existing) {
    throw new SelfServiceError("A return request for this order is already being reviewed.");
  }

  await prisma.returnRequest.create({
    data: {
      orderId: order.id,
      customerId: order.customerId,
      reason: cleanReason,
      photoUrl: photoUrl?.trim() || null,
    },
  });
}

/** Whether a delivered order is still inside its return window (for the UI). */
export async function returnWindowOpen(orderId: number): Promise<boolean> {
  const config = await getConversionConfig();
  const deliveredLog = await prisma.orderStatusLog.findFirst({
    where: { orderId, toStatus: "DELIVERED" },
    orderBy: { createdAt: "desc" },
  });
  if (!deliveredLog) return false;
  const deadline = new Date(
    deliveredLog.createdAt.getTime() + config.returnWindowDays * 24 * 60 * 60 * 1000,
  );
  return new Date() <= deadline;
}
