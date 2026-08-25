import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────
// Stock locations
// ─────────────────────────────────────────────────────────────
//
// Where stock physically sits. A LABEL on movements rather than a separate
// stock pool — see the note on StockLocation in the schema for why.
//
// The one invariant maintained here: exactly one location is the default, so
// "where did this delivery land?" always has an answer without asking.

export class LocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocationError";
  }
}

export interface LocationInput {
  name: string;
  note?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
}

export async function listLocations(includeInactive = false) {
  return prisma.stockLocation.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getLocation(id: number) {
  return prisma.stockLocation.findUnique({ where: { id } });
}

/**
 * The location goods land in when nobody says otherwise.
 *
 * Returns null when the shop has never set one up, which is the normal state
 * for a single-location shop: callers then record no location at all rather
 * than inventing one.
 */
export async function getDefaultLocation() {
  return (
    (await prisma.stockLocation.findFirst({ where: { isDefault: true, isActive: true } })) ??
    (await prisma.stockLocation.findFirst({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }))
  );
}

export async function saveLocation(id: number | null, input: LocationInput) {
  const name = input.name.trim();
  if (!name) throw new LocationError("Give the location a name.");

  return prisma.$transaction(async (tx) => {
    const clash = await tx.stockLocation.findFirst({
      where: { name, ...(id ? { id: { not: id } } : {}) },
      select: { id: true },
    });
    if (clash) throw new LocationError(`There is already a location called "${name}".`);

    const data = {
      name,
      note: input.note?.trim() || null,
      isActive: input.isActive ?? true,
    };

    const saved = id
      ? await tx.stockLocation.update({ where: { id }, data })
      : await tx.stockLocation.create({ data });

    // Exactly one default. Claiming it clears every other, so the invariant is
    // enforced by the write rather than hoped for.
    if (input.isDefault) {
      await tx.stockLocation.updateMany({
        where: { id: { not: saved.id } },
        data: { isDefault: false },
      });
      await tx.stockLocation.update({ where: { id: saved.id }, data: { isDefault: true } });
    }

    // The shop must never be left with no default while a location exists.
    const anyDefault = await tx.stockLocation.count({ where: { isDefault: true, isActive: true } });
    if (anyDefault === 0) {
      const first = await tx.stockLocation.findFirst({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      });
      if (first) {
        await tx.stockLocation.update({ where: { id: first.id }, data: { isDefault: true } });
      }
    }

    return saved;
  });
}

/**
 * Delete a location.
 *
 * Allowed even when movements reference it: the FK is SetNull, so the history
 * survives with its location forgotten rather than the rows being destroyed.
 * That is the right trade — a movement is a fact about stock, and a location is
 * only a note about where it happened.
 */
export async function deleteLocation(id: number): Promise<void> {
  const open = await prisma.stockTake.count({ where: { locationId: id, status: "OPEN" } });
  if (open > 0) {
    throw new LocationError(
      "A stock-take is still open at this location. Finish or cancel it first.",
    );
  }
  await prisma.stockLocation.delete({ where: { id } });

  // Deleting the default hands the role on rather than leaving none.
  const anyDefault = await prisma.stockLocation.count({ where: { isDefault: true } });
  if (anyDefault === 0) {
    const first = await prisma.stockLocation.findFirst({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
    if (first) {
      await prisma.stockLocation.update({ where: { id: first.id }, data: { isDefault: true } });
    }
  }
}

export interface LocationBalanceRow {
  locationId: number | null;
  name: string;
  /** Net units the ledger attributes to this location. */
  units: number;
  movements: number;
}

/**
 * Net stock per location, DERIVED from the ledger.
 *
 * Honest by construction: it sums the movements that name each location, so it
 * reports what has been recorded rather than a level someone maintains. The
 * "Not recorded" row is every movement written before locations existed — real
 * stock whose whereabouts simply were never captured, shown rather than hidden
 * so the totals still add up to the shop.
 */
export async function getLocationBalances(): Promise<LocationBalanceRow[]> {
  const [grouped, locations] = await Promise.all([
    prisma.stockMovement.groupBy({
      by: ["locationId"],
      _sum: { delta: true },
      _count: { _all: true },
    }),
    prisma.stockLocation.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);

  const byId = new Map(locations.map((l) => [l.id, l.name]));

  return grouped
    .map((g) => ({
      locationId: g.locationId,
      name: g.locationId == null ? "Not recorded" : (byId.get(g.locationId) ?? "Deleted location"),
      units: g._sum.delta ?? 0,
      movements: g._count._all,
    }))
    .sort((a, b) => {
      // Real locations first, "Not recorded" last — it's context, not a place.
      if (a.locationId == null) return 1;
      if (b.locationId == null) return -1;
      return b.units - a.units;
    });
}
