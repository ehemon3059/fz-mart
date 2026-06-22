import { prisma } from "@/lib/prisma";
import { createConsignment, getConsignmentStatus } from "@/integrations/courier";
import { getCourierConfig } from "@/server/settings/courier";

export class CourierServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CourierServiceError";
  }
}

/** Creates a consignment for an order and stores the resulting CourierShipment. */
export async function shipOrder(orderId: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { courierShipment: true },
  });
  if (!order) {
    throw new CourierServiceError("Order not found.");
  }
  if (order.courierShipment) {
    throw new CourierServiceError("This order already has a courier shipment.");
  }

  const config = await getCourierConfig();
  if (!config) {
    throw new CourierServiceError(
      "Courier is not configured — set it under Admin > Settings > Courier.",
    );
  }

  const result = await createConsignment({
    orderNo: order.orderNo,
    recipientName: order.customerName,
    recipientPhone: order.customerPhone,
    recipientAddress: order.address,
    codAmount: order.total,
  });

  return prisma.courierShipment.create({
    data: {
      orderId: order.id,
      courierName: config.provider || "stub",
      consignmentId: result.consignmentId,
      trackingCode: result.trackingCode,
      courierStatus: result.status,
    },
  });
}

/** Polls the provider and updates the stored status (manual "refresh" action). */
export async function syncShipmentStatus(orderId: number) {
  const shipment = await prisma.courierShipment.findUnique({ where: { orderId } });
  if (!shipment) {
    throw new CourierServiceError("This order has no courier shipment yet.");
  }

  const status = await getConsignmentStatus(shipment.consignmentId);

  return prisma.courierShipment.update({
    where: { orderId },
    data: { courierStatus: status, lastSyncedAt: new Date() },
  });
}

export async function getShipmentByOrderId(orderId: number) {
  return prisma.courierShipment.findUnique({ where: { orderId } });
}
