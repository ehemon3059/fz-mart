import { listActiveShippingZones } from "@/server/settings/shipping";
import { getCheckoutPaymentOptions } from "@/server/settings/payments";
import { getCurrentCustomer } from "@/lib/customer-session";
import CheckoutForm from "./CheckoutForm";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ buyNow?: string; variant?: string }>;
}) {
  const { buyNow, variant } = await searchParams;
  const [zones, paymentOptions, customer] = await Promise.all([
    listActiveShippingZones(),
    getCheckoutPaymentOptions(),
    getCurrentCustomer(),
  ]);

  return (
    <div className="co-wrap">
      <h1 className="co-title">Checkout</h1>
      <CheckoutForm
        zones={zones}
        paymentOptions={paymentOptions}
        buyNowProductId={buyNow ? Number(buyNow) : null}
        buyNowVariantId={variant ? Number(variant) : null}
        loggedIn={customer != null}
      />
    </div>
  );
}
