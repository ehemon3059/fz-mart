import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Icon } from "@/components/icons";
import { listZoneOptions } from "@/server/settings/shippingAdmin";
import { listParentOptions } from "@/server/settings/locationsAdmin";
import LocationForm, { type Level } from "../LocationForm";

export const metadata = { title: "New Delivery Location — FZ-Mart Admin" };

const LEVELS: Level[] = ["division", "district", "upazila"];

function asLevel(raw: string | undefined): Level {
  return LEVELS.includes(raw as Level) ? (raw as Level) : "division";
}

/**
 * What a location left on "Inherit" would actually charge, phrased for the
 * form's first dropdown option. Resolved from the chosen parent so the admin
 * sees the real consequence of leaving it alone, not a generic label.
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
    const zone = division?.shippingZone;
    return zone && zone.isActive
      ? `uses ${division?.name}'s zone (${zone.name})`
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

export default async function NewLocationPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; parent?: string }>;
}) {
  const { level: levelRaw, parent } = await searchParams;
  const level = asLevel(levelRaw);
  const parentId = parent ? Number(parent) : null;

  const [zones, parents, inherited] = await Promise.all([
    listZoneOptions(),
    listParentOptions(),
    inheritedLabel(level, parentId),
  ]);

  const title =
    level === "division" ? "New Division" : level === "district" ? "New District" : "New Upazila";

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-6 pb-28 sm:px-7 sm:py-8 lg:pb-8">
      <Link
        href="/admin/settings/locations"
        className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-stone-500 hover:text-stone-800"
      >
        <Icon name="arrowLeft" size={16} /> Back to Delivery Locations
      </Link>
      <h1 className="mt-3 text-[26px] font-extrabold tracking-tight text-stone-900">{title}</h1>
      <p className="mt-1 text-[14.5px] text-stone-500">
        Add a place customers can choose at checkout.
      </p>

      <div className="mt-6">
        <LocationForm
          level={level}
          zones={zones}
          parents={parents}
          inheritedLabel={inherited}
          defaultParentId={parentId}
        />
      </div>
    </div>
  );
}
