import Link from "next/link";
import { listAllShippingZones } from "@/server/settings/shippingAdmin";
import { formatTaka } from "@/lib/money";
import DeleteButton from "@/components/admin/DeleteButton";
import { removeShippingZone } from "./actions";

export default async function AdminShippingZonesPage() {
  const zones = await listAllShippingZones();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Shipping Zones</h1>
        <Link
          href="/admin/settings/shipping/new"
          className="bg-black text-white px-4 py-2 rounded text-sm font-medium"
        >
          + New Zone
        </Link>
      </div>

      <div className="border rounded-lg bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Charge</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {zones.map((zone) => (
              <tr key={zone.id}>
                <td className="px-4 py-2 font-medium">{zone.name}</td>
                <td className="px-4 py-2">{formatTaka(zone.charge)}</td>
                <td className="px-4 py-2">
                  <span className={zone.isActive ? "text-green-700" : "text-gray-400"}>
                    {zone.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-3 justify-end">
                    <Link
                      href={`/admin/settings/shipping/${zone.id}/edit`}
                      className="underline"
                    >
                      Edit
                    </Link>
                    <DeleteButton action={removeShippingZone} id={zone.id} label="zone" />
                  </div>
                </td>
              </tr>
            ))}
            {zones.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  No shipping zones yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
