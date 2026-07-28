import { listActiveShippingZones } from "@/server/settings/shipping";
import { getCheckoutPaymentOptions } from "@/server/settings/payments";
import { getCurrentCustomer } from "@/lib/customer-session";
import { listAddresses, MAX_ADDRESSES } from "@/server/customers/addresses";
import { getProfile } from "@/server/customers/profile";
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

  // Saved addresses only exist for signed-in customers; guests get the plain
  // form exactly as before.
  const [savedAddresses, profile] = customer
    ? await Promise.all([listAddresses(customer.customerId), getProfile(customer.customerId)])
    : [[], null];

  return (
    <div className="co-wrap">
      <h1 className="co-title">Checkout</h1>
      <CheckoutForm
        zones={zones}
        paymentOptions={paymentOptions}
        buyNowProductId={buyNow ? Number(buyNow) : null}
        buyNowVariantId={variant ? Number(variant) : null}
        loggedIn={customer != null}
        savedAddresses={savedAddresses.map((a) => ({
          id: a.id,
          label: a.label,
          fullName: a.fullName,
          phone: a.phone,
          address: a.address,
          shippingZoneId: a.shippingZoneId,
          isDefault: a.isDefault,
        }))}
        maxAddresses={MAX_ADDRESSES}
        contactEmail={profile?.contactEmail ?? profile?.email ?? ""}
      />
    </div>
  );
}
