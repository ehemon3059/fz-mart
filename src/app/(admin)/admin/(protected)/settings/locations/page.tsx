import Link from "next/link";
import { listLocationTree } from "@/server/settings/locationsAdmin";
import { Icon } from "@/components/icons";
import LocationTreeView from "./LocationTreeView";

export const metadata = { title: "Delivery Locations — FZ-Mart Admin" };

export default async function AdminLocationsPage() {
  const divisions = await listLocationTree();

  const districtCount = divisions.reduce((n, d) => n + d.districts.length, 0);
  const upazilaCount = divisions.reduce(
    (n, d) => n + d.districts.reduce((m, s) => m + s.upazilas.length, 0),
    0,
  );

  const stats = [
    { label: "Divisions", value: divisions.length, sub: "top level", tone: "neutral" as const },
    { label: "Districts", value: districtCount, sub: "under divisions", tone: "brand" as const },
    { label: "Upazilas", value: upazilaCount, sub: "thana level", tone: "neutral" as const },
  ];

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-6 pb-28 sm:px-7 sm:py-8 lg:pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-stone-900">
            Delivery Locations
          </h1>
          <p className="mt-1 text-[14.5px] text-stone-500">
            The Division → District → Upazila list customers pick from at checkout.
          </p>
        </div>
        <Link
          href="/admin/settings/locations/new?level=division"
          className="hidden items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-brand-700 lg:flex"
        >
          <Icon name="plus" size={17} /> New Division
        </Link>
        <Link
          href="/admin/settings/locations/new?level=division"
          aria-label="New Division"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm lg:hidden"
        >
          <Icon name="plus" size={20} />
        </Link>
      </div>

      {/* How the charge is decided — the one rule an admin must understand
          before editing anything here. */}
      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
        <p className="text-[13.5px] font-bold text-amber-900">How the delivery charge is chosen</p>
        <p className="mt-1 text-[13px] leading-relaxed text-amber-800">
          The most specific zone wins: an <b>upazila&apos;s</b> zone beats its{" "}
          <b>district&apos;s</b>, which beats its <b>division&apos;s</b>. A location left on{" "}
          <em>Inherit</em> uses whatever its parent resolves to, and anything still unset falls back
          to the zone marked <b>Fallback</b> on{" "}
          <Link href="/admin/settings/shipping" className="underline">
            Shipping Zones
          </Link>
          . That is how Savar can cost more than the rest of Dhaka without any special rule.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`rounded-xl border border-stone-200 bg-white p-4 shadow-soft ${
              i === 2 ? "col-span-2 sm:col-span-1" : ""
            }`}
          >
            <p className="text-[12.5px] font-medium text-stone-500">{s.label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={[
                  "text-[26px] font-extrabold tracking-tight sm:text-[28px]",
                  s.tone === "brand" ? "text-brand-600" : "text-stone-900",
                ].join(" ")}
              >
                {s.value}
              </span>
              <span className="text-[12px] text-stone-400">{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        {divisions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white py-16 text-center shadow-soft">
            <p className="text-[15px] font-semibold text-stone-700">No locations yet</p>
            <p className="mx-auto mt-1 max-w-md text-[13.5px] text-stone-400">
              Checkout cannot take an order until at least one division and district exist. Add them
              here, or load all 8 divisions and 64 districts at once by running{" "}
              <code className="rounded bg-stone-100 px-1.5 py-0.5 text-[12px] text-stone-600">
                npx tsx --env-file=.env prisma/seed-locations.ts
              </code>
              .
            </p>
          </div>
        ) : (
          <LocationTreeView
            divisions={divisions.map((div) => ({
              id: div.id,
              name: div.name,
              isActive: div.isActive,
              sortOrder: div.sortOrder,
              zone: div.shippingZone,
              districts: div.districts.map((dis) => ({
                id: dis.id,
                name: dis.name,
                isActive: dis.isActive,
                sortOrder: dis.sortOrder,
                zone: dis.shippingZone,
                upazilas: dis.upazilas.map((upz) => ({
                  id: upz.id,
                  name: upz.name,
                  isActive: upz.isActive,
                  sortOrder: upz.sortOrder,
                  zone: upz.shippingZone,
                })),
              })),
            }))}
          />
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200 bg-white p-4 lg:hidden">
        <Link
          href="/admin/settings/locations/new?level=division"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-[15px] font-semibold text-white shadow"
        >
          <Icon name="plus" size={19} /> New Division
        </Link>
      </div>
    </div>
  );
}
