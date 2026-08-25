import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

/**
 * Admin CRUD for the delivery-location tree.
 *
 * Divisions, districts and upazilas share one shape — name, optional zone,
 * active flag, sort order — so they share one set of helpers parameterised by
 * level, rather than three near-identical copies that could drift.
 */

export type LocationLevel = "division" | "district" | "upazila";

export interface LocationInput {
  name: string;
  /** Null means "inherit from the parent" — the common case. */
  shippingZoneId: number | null;
  isActive: boolean;
  sortOrder: number;
  /** Required for districts (a division) and upazilas (a district). */
  parentId?: number | null;
}

/** Full tree for the admin list — includes INACTIVE rows, unlike the storefront. */
export async function listLocationTree() {
  return prisma.division.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      shippingZone: { select: { id: true, name: true, charge: true, isActive: true } },
      _count: { select: { districts: true } },
      districts: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          shippingZone: { select: { id: true, name: true, charge: true, isActive: true } },
          _count: { select: { upazilas: true } },
          upazilas: {
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            include: {
              shippingZone: { select: { id: true, name: true, charge: true, isActive: true } },
            },
          },
        },
      },
    },
  });
}

export async function getDivision(id: number) {
  return prisma.division.findUnique({ where: { id } });
}

export async function getDistrict(id: number) {
  return prisma.district.findUnique({ where: { id }, include: { division: true } });
}

export async function getUpazila(id: number) {
  return prisma.upazila.findUnique({
    where: { id },
    include: { district: { include: { division: true } } },
  });
}

/** Divisions/districts for the parent dropdowns on the add forms. */
export async function listParentOptions() {
  const divisions = await prisma.division.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      districts: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      },
    },
  });
  return divisions;
}

/**
 * Names are Bangla, which slugify reduces to empty — so a unique ASCII slug is
 * derived from the name where possible and falls back to the level plus a
 * timestamp. The slug is internal (seed idempotency, stable identity across
 * renames); the admin never sees or types it.
 */
async function uniqueSlug(level: LocationLevel, name: string): Promise<string> {
  const base = slugify(name) || `${level}-${Date.now().toString(36)}`;
  const taken = async (slug: string) => {
    const [d, s, u] = await Promise.all([
      prisma.division.findUnique({ where: { slug }, select: { id: true } }),
      prisma.district.findUnique({ where: { slug }, select: { id: true } }),
      prisma.upazila.findUnique({ where: { slug }, select: { id: true } }),
    ]);
    return Boolean(d || s || u);
  };
  let slug = base;
  for (let n = 2; await taken(slug); n++) {
    slug = `${base}-${n}`;
  }
  return slug;
}

export class LocationAdminError extends Error {}

export async function createLocation(level: LocationLevel, input: LocationInput) {
  const slug = await uniqueSlug(level, input.name);
  const base = {
    name: input.name,
    slug,
    shippingZoneId: input.shippingZoneId,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
  };

  if (level === "division") {
    return prisma.division.create({ data: base });
  }
  if (!input.parentId) {
    throw new LocationAdminError(
      level === "district" ? "Choose a division." : "Choose a district.",
    );
  }
  if (level === "district") {
    return prisma.district.create({ data: { ...base, divisionId: input.parentId } });
  }
  return prisma.upazila.create({ data: { ...base, districtId: input.parentId } });
}

export async function updateLocation(
  level: LocationLevel,
  id: number,
  input: LocationInput,
) {
  // The slug is deliberately NOT regenerated on rename: it is the stable
  // identity the seed matches on, so renaming "ঢাকা" must not orphan it.
  const base = {
    name: input.name,
    shippingZoneId: input.shippingZoneId,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
  };

  if (level === "division") {
    return prisma.division.update({ where: { id }, data: base });
  }
  if (!input.parentId) {
    throw new LocationAdminError(
      level === "district" ? "Choose a division." : "Choose a district.",
    );
  }
  if (level === "district") {
    return prisma.district.update({
      where: { id },
      data: { ...base, divisionId: input.parentId },
    });
  }
  return prisma.upazila.update({
    where: { id },
    data: { ...base, districtId: input.parentId },
  });
}

/**
 * Deleting cascades to children by the schema's onDelete rules — removing a
 * division takes its districts and their upazilas with it. Orders are safe
 * either way: they store the location as TEXT, never as a foreign key.
 */
export async function deleteLocation(level: LocationLevel, id: number) {
  if (level === "division") return prisma.division.delete({ where: { id } });
  if (level === "district") return prisma.district.delete({ where: { id } });
  return prisma.upazila.delete({ where: { id } });
}

/** How many rows a delete would take with it — shown in the confirm prompt. */
export async function countDescendants(level: LocationLevel, id: number) {
  if (level === "division") {
    const districts = await prisma.district.findMany({
      where: { divisionId: id },
      select: { _count: { select: { upazilas: true } } },
    });
    return {
      districts: districts.length,
      upazilas: districts.reduce((n, d) => n + d._count.upazilas, 0),
    };
  }
  if (level === "district") {
    return { districts: 0, upazilas: await prisma.upazila.count({ where: { districtId: id } }) };
  }
  return { districts: 0, upazilas: 0 };
}
