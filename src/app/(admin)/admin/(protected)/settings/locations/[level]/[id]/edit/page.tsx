import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Icon } from "@/components/icons";
import { listZoneOptions } from "@/server/settings/shippingAdmin";
import {
  listParentOptions,
  getDivision,
  getDistrict,
  getUpazila,
} from "@/server/settings/locationsAdmin";
import LocationForm, { type Level } from "../../../LocationForm";

export const metadata = { title: "Edit Delivery Location — FZ-Mart Admin" };

const LEVELS: Level[] = ["division", "district", "upazila"];

/**
 * What this location would charge if its own zone were cleared. Computed from
 * its real parent chain so "Inherit" states the actual consequence.
 */
async function inheritedLabel(level: Level, parentId: number | null): Promise<string> {
  const fallback = await prisma.shippingZone.findFirst({
    where: { isFallback: true, isActive: true },
    select: { name: true },
  });
  const fallbackName = fallback ? fallback.name : "no fallback zone set";

  if (level === "division" || !parentId) return `uses ${fallbackName}`;

  if (level === "district") {
    const division = await prisma.division.findUnique({
      where: { id: parentId },
      select: { name: true, shippingZone: { select: { name: true, isActive: true } } },
    });
    return division?.shippingZone?.isActive
      ? `uses ${division.name}'s zone (${division.shippingZone.name})`
      : `uses ${fallbackName}`;
  }

  const district = await prisma.district.findUnique({
    where: { id: parentId },
    select: {
      name: true,
      shippingZone: { select: { name: true, isActive: true } },
      division: { select: { name: true, shippingZone: { select: { name: true, isActive: true } } } },
    },
  });
  if (district?.shippingZone?.isActive) {
    return `uses ${district.name}'s zone (${district.shippingZone.name})`;
  }
  if (district?.division.shippingZone?.isActive) {
    return `uses ${district.division.name}'s zone (${district.division.shippingZone.name})`;
  }
  return `uses ${fallbackName}`;
}

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ level: string; id: string }>;
}) {
  const { level: levelRaw, id: idRaw } = await params;
  if (!LEVELS.includes(levelRaw as Level)) notFound();
  const level = levelRaw as Level;
  const id = Number(idRaw);
  if (!Number.isInteger(id)) notFound();

  // Each level lives in its own table, so the row and its parent id are read
  // per level and then normalised into the one shape the form takes.
  let name: string;
  let shippingZoneId: number | null;
  let isActive: boolean;
  let sortOrder: number;
  let parentId: number | null = null;
  let breadcrumb: string;

  if (level === "division") {
    const row = await getDivision(id);
    if (!row) notFound();
    ({ name, shippingZoneId, isActive, sortOrder } = row);
    breadcrumb = row.name;
  } else if (level === "district") {
    const row = await getDistrict(id);
    if (!row) notFound();
    ({ name, shippingZoneId, isActive, sortOrder } = row);
    parentId = row.divisionId;
    breadcrumb = `${row.division.name} › ${row.name}`;
  } else {
    const row = await getUpazila(id);
    if (!row) notFound();
    ({ name, shippingZoneId, isActive, sortOrder } = row);
    parentId = row.districtId;
    breadcrumb = `${row.district.division.name} › ${row.district.name} › ${row.name}`;
  }

  const [zones, parents, inherited] = await Promise.all([
    listZoneOptions(),
    listParentOptions(),
    inheritedLabel(level, parentId),
  ]);

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-6 pb-28 sm:px-7 sm:py-8 lg:pb-8">
      <Link
        href="/admin/settings/locations"
        className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-stone-500 hover:text-stone-800"
      >
        <Icon name="arrowLeft" size={16} /> Back to Delivery Locations
      </Link>
      <h1 className="mt-3 text-[26px] font-extrabold tracking-tight text-stone-900">
        Edit {level === "upazila" ? "Upazila" : level === "district" ? "District" : "Division"}
      </h1>
      <p className="mt-1 text-[14.5px] text-stone-500">{breadcrumb}</p>

      <div className="mt-6">
        <LocationForm
          level={level}
          zones={zones}
          parents={parents}
          inheritedLabel={inherited}
          location={{ id, name, shippingZoneId, isActive, sortOrder, parentId }}
        />
      </div>
    </div>
  );
}
