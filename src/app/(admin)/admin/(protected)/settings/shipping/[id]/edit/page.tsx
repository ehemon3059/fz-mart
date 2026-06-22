import { notFound } from "next/navigation";
import { getShippingZoneById } from "@/server/settings/shippingAdmin";
import ShippingZoneForm from "../../ShippingZoneForm";

export default async function EditShippingZonePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const zone = await getShippingZoneById(Number(id));
  if (!zone) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit Shipping Zone</h1>
      <ShippingZoneForm zone={zone} />
    </div>
  );
}
