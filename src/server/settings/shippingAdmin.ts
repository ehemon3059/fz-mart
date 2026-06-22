import { prisma } from "@/lib/prisma";

export async function listAllShippingZones() {
  return prisma.shippingZone.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getShippingZoneById(id: number) {
  return prisma.shippingZone.findUnique({ where: { id } });
}

export interface ShippingZoneInput {
  name: string;
  /** Paisa */
  charge: number;
  sortOrder?: number;
  isActive?: boolean;
}

export async function createShippingZone(input: ShippingZoneInput) {
  return prisma.shippingZone.create({
    data: {
      name: input.name,
      charge: input.charge,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateShippingZone(id: number, input: ShippingZoneInput) {
  return prisma.shippingZone.update({
    where: { id },
    data: {
      name: input.name,
      charge: input.charge,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
  });
}

export async function deleteShippingZone(id: number) {
  // Orders reference shippingZoneId without onDelete: Cascade in the schema,
  // so Prisma will throw (FK constraint) if any order still uses this zone —
  // the safe default, since deleting a zone must never corrupt order history.
  return prisma.shippingZone.delete({ where: { id } });
}
