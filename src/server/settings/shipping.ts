import { prisma } from "@/lib/prisma";

export async function listActiveShippingZones() {
  return prisma.shippingZone.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

/** Server-side authority on delivery charge — never trust a client-submitted value. */
export async function getShippingZoneCharge(zoneId: number): Promise<number> {
  const zone = await prisma.shippingZone.findUnique({
    where: { id: zoneId, isActive: true },
  });
  if (!zone) {
    throw new Error("Invalid shipping zone");
  }
  return zone.charge;
}
