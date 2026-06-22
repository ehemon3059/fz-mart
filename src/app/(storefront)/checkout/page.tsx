import { listActiveShippingZones } from "@/server/settings/shipping";
import CheckoutForm from "./CheckoutForm";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ buyNow?: string }>;
}) {
  const { buyNow } = await searchParams;
  const zones = await listActiveShippingZones();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
      <CheckoutForm zones={zones} buyNowProductId={buyNow ? Number(buyNow) : null} />
    </div>
  );
}
