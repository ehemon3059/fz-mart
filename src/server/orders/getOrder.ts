import { prisma } from "@/lib/prisma";

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
