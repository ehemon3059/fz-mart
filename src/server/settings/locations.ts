import { prisma } from "@/lib/prisma";

/**
 * Delivery-location tree for the checkout dropdowns.
 *
 * The whole active tree is small (8 divisions / ~64 districts / a few hundred
 * upazilas) and changes only when an admin edits it, so it ships to the client
 * in one payload and the cascading selects resolve instantly — no request per
 * dropdown change, which matters on a slow mobile connection mid-checkout.
 */

export interface UpazilaOption {
  id: number;
  name: string;
  /** Effective charge in paisa once the zone chain is resolved. */
  charge: number;
  /** Name of the zone the charge came from — shown as the badge at checkout. */
  zoneName: string;
  zoneId: number | null;
}

export interface DistrictOption {
  id: number;
  name: string;
  charge: number;
  zoneName: string;
  zoneId: number | null;
  upazilas: UpazilaOption[];
}

export interface DivisionOption {
  id: number;
  name: string;
  charge: number;
  zoneName: string;
  zoneId: number | null;
  districts: DistrictOption[];
}

/** What checkout needs to render locations and price them. */
export interface LocationTree {
  divisions: DivisionOption[];
  /** True when the admin has set up at least one division. */
  configured: boolean;
}

interface ResolvedZone {
  zoneId: number | null;
  zoneName: string;
  charge: number;
}

const NO_ZONE: ResolvedZone = { zoneId: null, zoneName: "", charge: 0 };

/**
 * Builds the full active location tree with every level's charge already
 * resolved most-specific-first: a level's own zone wins, otherwise it inherits
 * whatever its parent resolved to, and the fallback zone catches the rest.
 *
 * Resolving here (rather than in the client) means the browser never has to
 * know the inheritance rule, and the number it shows is the same number the
 * server will charge.
 */
export async function getLocationTree(): Promise<LocationTree> {
  const [divisions, fallback] = await Promise.all([
    prisma.division.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        shippingZone: true,
        districts: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          include: {
            shippingZone: true,
            upazilas: {
              where: { isActive: true },
              orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
              include: { shippingZone: true },
            },
          },
        },
      },
    }),
    prisma.shippingZone.findFirst({ where: { isFallback: true, isActive: true } }),
  ]);

  const root: ResolvedZone = fallback
    ? { zoneId: fallback.id, zoneName: fallback.name, charge: fallback.charge }
    : NO_ZONE;

  // An inactive zone is treated as "not set" so deactivating a zone cleanly
  // falls the whole subtree back to its parent instead of charging a hidden rate.
  const own = (zone: { id: number; name: string; charge: number; isActive: boolean } | null) =>
    zone && zone.isActive ? { zoneId: zone.id, zoneName: zone.name, charge: zone.charge } : null;

  return {
    configured: divisions.length > 0,
    divisions: divisions.map((div) => {
      const divZone = own(div.shippingZone) ?? root;
      return {
        id: div.id,
        name: div.name,
        ...divZone,
        districts: div.districts.map((dis) => {
          const disZone = own(dis.shippingZone) ?? divZone;
          return {
            id: dis.id,
            name: dis.name,
            ...disZone,
            upazilas: dis.upazilas.map((upz) => ({
              id: upz.id,
              name: upz.name,
              ...(own(upz.shippingZone) ?? disZone),
            })),
          };
        }),
      };
    }),
  };
}

export class LocationError extends Error {}

/** A location the customer picked, as resolved and priced by the server. */
export interface ResolvedLocation {
  divisionId: number;
  divisionName: string;
  districtId: number;
  districtName: string;
  upazilaId: number | null;
  upazilaName: string | null;
  zoneId: number | null;
  zoneName: string;
  charge: number;
}

/**
 * Server-side authority on the delivery charge for a chosen location — the
 * client's displayed price is never trusted. Re-walks the same
 * upazila → district → division → fallback chain against live rows, so a zone
 * repriced between page load and submit charges the NEW rate.
 *
 * `tx` lets createOrder resolve inside its own transaction, keeping the charge
 * consistent with the rest of the order it writes.
 */
export async function resolveDeliveryLocation(
  input: { divisionId: number; districtId: number; upazilaId?: number | null },
  tx: Pick<typeof prisma, "district" | "upazila" | "shippingZone"> = prisma,
): Promise<ResolvedLocation> {
  const district = await tx.district.findFirst({
    where: { id: input.districtId, isActive: true, divisionId: input.divisionId },
    include: { shippingZone: true, division: { include: { shippingZone: true } } },
  });
  if (!district || !district.division.isActive) {
    throw new LocationError("Selected delivery location is no longer available.");
  }

  let upazila = null;
  if (input.upazilaId) {
    upazila = await tx.upazila.findFirst({
      where: { id: input.upazilaId, isActive: true, districtId: district.id },
      include: { shippingZone: true },
    });
    if (!upazila) {
      throw new LocationError("Selected upazila is no longer available.");
    }
  }

  const active = (z: { id: number; name: string; charge: number; isActive: boolean } | null | undefined) =>
    z && z.isActive ? z : null;

  const zone =
    active(upazila?.shippingZone) ??
    active(district.shippingZone) ??
    active(district.division.shippingZone) ??
    (await tx.shippingZone.findFirst({ where: { isFallback: true, isActive: true } }));

  if (!zone) {
    throw new LocationError(
      "No delivery charge is configured for that location. Please contact us to order.",
    );
  }

  return {
    divisionId: district.division.id,
    divisionName: district.division.name,
    districtId: district.id,
    districtName: district.name,
    upazilaId: upazila?.id ?? null,
    upazilaName: upazila?.name ?? null,
    zoneId: zone.id,
    zoneName: zone.name,
    charge: zone.charge,
  };
}
