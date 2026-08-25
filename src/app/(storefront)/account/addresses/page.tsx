import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-session";
import { listAddresses, MAX_ADDRESSES } from "@/server/customers/addresses";
import { getLocationTree } from "@/server/settings/locations";
import { getProfile } from "@/server/customers/profile";
import AddressBook from "./AddressBook";

export const metadata = { title: "Delivery Addresses — FZ Mart", robots: { index: false } };

export default async function AddressesPage() {
  const session = await getCurrentCustomer();
  if (!session) redirect("/login?next=/account/addresses");

  const [addresses, locations, profile] = await Promise.all([
    listAddresses(session.customerId),
    getLocationTree(),
    getProfile(session.customerId),
  ]);

  return (
    <AddressBook
      addresses={addresses.map((a) => ({
        id: a.id,
        label: a.label,
        fullName: a.fullName,
        phone: a.phone,
        address: a.address,
        divisionId: a.divisionId,
        districtId: a.districtId,
        upazilaId: a.upazilaId,
        shippingZoneId: a.shippingZoneId,
        isDefault: a.isDefault,
      }))}
      locations={locations}
      max={MAX_ADDRESSES}
      // Prefill a brand-new address from the profile — most people's first
      // address is their own.
      defaults={{ fullName: profile?.name ?? "", phone: profile?.phone ?? "" }}
    />
  );
}
