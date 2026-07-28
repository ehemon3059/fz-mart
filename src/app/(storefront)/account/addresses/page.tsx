import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-session";
import { prisma } from "@/lib/prisma";
import { listAddresses, MAX_ADDRESSES } from "@/server/customers/addresses";
import { getProfile } from "@/server/customers/profile";
import AddressBook from "./AddressBook";

export const metadata = { title: "Delivery Addresses — FZ Mart", robots: { index: false } };

export default async function AddressesPage() {
  const session = await getCurrentCustomer();
  if (!session) redirect("/login?next=/account/addresses");

  const [addresses, zones, profile] = await Promise.all([
    listAddresses(session.customerId),
    prisma.shippingZone.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, charge: true },
    }),
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
        shippingZoneId: a.shippingZoneId,
        isDefault: a.isDefault,
      }))}
      zones={zones}
      max={MAX_ADDRESSES}
      // Prefill a brand-new address from the profile — most people's first
      // address is their own.
      defaults={{ fullName: profile?.name ?? "", phone: profile?.phone ?? "" }}
    />
  );
}
