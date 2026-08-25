import { listLocations, getLocationBalances } from "@/server/inventory/locations";
import LocationsClient from "./LocationsClient";

export const metadata = { title: "Stock Locations — FZ-Mart Admin" };

export default async function LocationsPage() {
  const [locations, balances] = await Promise.all([
    listLocations(true),
    getLocationBalances(),
  ]);

  return (
    <div className="max-w-4xl space-y-6 px-4 py-8 sm:px-7">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
          Stock Locations
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Where your stock physically sits. Each delivery and each count records which place it
          touched, so you can tell what is where.
        </p>
      </div>

      <LocationsClient
        locations={locations.map((l) => ({
          id: l.id,
          name: l.name,
          note: l.note,
          isDefault: l.isDefault,
          isActive: l.isActive,
        }))}
        balances={balances}
      />
    </div>
  );
}
