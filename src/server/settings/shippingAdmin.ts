import { prisma } from "@/lib/prisma";

export async function listAllShippingZones() {
  return prisma.shippingZone.findMany({
    orderBy: { sortOrder: "asc" },
    // How many locations price against each zone — the admin list shows it so
    // a zone about to be deleted or repriced states its blast radius up front.
    include: {
      _count: { select: { divisions: true, districts: true, upazilas: true, orders: true } },
    },
  });
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
  /** Charge used when a location's chain names no zone of its own. */
  isFallback?: boolean;
}

/**
 * At most one zone may be the fallback, so the lookup can never depend on row
 * order. Promoting one demotes the rest in the same transaction as the write.
 */
async function writeZone(
  id: number | null,
  input: ShippingZoneInput,
) {
  const data = {
    name: input.name,
    charge: input.charge,
    sortOrder: input.sortOrder ?? 0,
    isActive: input.isActive ?? true,
    isFallback: input.isFallback ?? false,
  };
  return prisma.$transaction(async (tx) => {
    const zone = id
      ? await tx.shippingZone.update({ where: { id }, data })
      : await tx.shippingZone.create({ data });
    if (data.isFallback) {
      await tx.shippingZone.updateMany({
        where: { isFallback: true, id: { not: zone.id } },
        data: { isFallback: false },
      });
    }
    return zone;
  });
}

export async function createShippingZone(input: ShippingZoneInput) {
  return writeZone(null, input);
}

export async function updateShippingZone(id: number, input: ShippingZoneInput) {
  return writeZone(id, input);
}

export async function listZoneOptions() {
  return prisma.shippingZone.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, charge: true },
  });
}

export async function deleteShippingZone(id: number) {
  // Orders reference shippingZoneId without onDelete: Cascade in the schema,
  // so Prisma will throw (FK constraint) if any order still uses this zone —
  // the safe default, since deleting a zone must never corrupt order history.
  return prisma.shippingZone.delete({ where: { id } });
}
