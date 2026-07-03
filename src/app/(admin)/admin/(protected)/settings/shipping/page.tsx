import Link from "next/link";
import { listAllShippingZones } from "@/server/settings/shippingAdmin";
import { formatTaka } from "@/lib/money";
import { Icon } from "@/components/icons";
import DeleteButton from "@/components/admin/DeleteButton";
import { removeShippingZone } from "./actions";

export const metadata = { title: "Shipping Zones — FZ-Mart Admin" };

export default async function AdminShippingZonesPage() {
  const zones = await listAllShippingZones();

  const active = zones.filter((z) => z.isActive).length;
  const stats = [
    { label: "Total zones", value: zones.length, sub: "configured", tone: "neutral" as const },
    { label: "Active", value: active, sub: "available at checkout", tone: "brand" as const },
    { label: "Inactive", value: zones.length - active, sub: "hidden", tone: "neutral" as const },
  ];

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-6 pb-28 sm:px-7 sm:py-8 lg:pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-stone-900">Shipping Zones</h1>
          <p className="mt-1 text-[14.5px] text-stone-500">
            Delivery charges offered at checkout — {zones.length} total.
          </p>
        </div>
        <Link
          href="/admin/settings/shipping/new"
          className="hidden items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-brand-700 lg:flex"
        >
          <Icon name="plus" size={17} /> New Zone
        </Link>
        <Link
          href="/admin/settings/shipping/new"
          aria-label="New Zone"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm lg:hidden"
        >
          <Icon name="plus" size={20} />
        </Link>
      </div>

      {/* Stats */}
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

      {/* List */}
      <div className="mt-6">
        {zones.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white py-16 text-center shadow-soft">
            <p className="text-[15px] font-semibold text-stone-700">No shipping zones yet</p>
            <p className="mt-1 text-[13.5px] text-stone-400">
              Add a zone so customers can pick a delivery charge at checkout.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-xl border border-stone-200 bg-white shadow-soft md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50 text-left">
                    {["Zone", "Charge", "Status", ""].map((h, i) => (
                      <th key={i} className="px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-wider text-stone-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {zones.map((zone) => (
                    <tr key={zone.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60">
                      <td className="px-5 py-4 text-[14.5px] font-semibold text-stone-900">{zone.name}</td>
                      <td className="px-5 py-4 text-[14px] text-stone-600">{formatTaka(zone.charge)}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                            zone.isActive ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"
                          }`}
                        >
                          {zone.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/settings/shipping/${zone.id}/edit`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                            aria-label="Edit"
                          >
                            <Icon name="pencil" size={16} />
                          </Link>
                          <DeleteButton action={removeShippingZone} id={zone.id} label="zone" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-4 md:hidden">
              {zones.map((zone) => (
                <div key={zone.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-semibold text-stone-900">{zone.name}</p>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                        zone.isActive ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {zone.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-2 text-[14px] text-stone-600">
                    Charge <span className="font-semibold text-stone-900">{formatTaka(zone.charge)}</span>
                  </p>
                  <div className="mt-3 flex items-center gap-2 border-t border-stone-100 pt-3">
                    <Link
                      href={`/admin/settings/shipping/${zone.id}/edit`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-stone-200 py-2 text-[13.5px] font-semibold text-stone-700"
                    >
                      <Icon name="pencil" size={15} /> Edit
                    </Link>
                    <DeleteButton action={removeShippingZone} id={zone.id} label="zone" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200 bg-white p-4 lg:hidden">
        <Link
          href="/admin/settings/shipping/new"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-[15px] font-semibold text-white shadow"
        >
          <Icon name="plus" size={19} /> New Zone
        </Link>
      </div>
    </div>
  );
}
