import { NextResponse, type NextRequest } from "next/server";
import { getPaymentAdapter, PaymentVerificationError } from "@/integrations/payments";
import { handleVerifiedPayment, PaymentFlowError } from "@/server/payments";
import { isPaymentProviderKey } from "@/server/settings/payments";

// Browser-return endpoint: where the gateway sends the CUSTOMER back.
//   - SSLCommerz POSTs to success_url/fail_url/cancel_url with the IPN payload
//   - bKash GETs its callbackURL with paymentID + status
// Either way the adapter re-verifies with the provider's server (validation
// API / execute call) — the redirect itself is never trusted — and the
// customer ends up on the human-readable /payment/return page. Idempotent
// with the IPN route; whichever lands first settles the payment.

async function handle(request: NextRequest, providerRaw: string) {
  let orderNo: string | null = null;
  let paid = false;

  if (isPaymentProviderKey(providerRaw)) {
    try {
      const verified = await getPaymentAdapter(providerRaw).verifyIpn(request);
      const outcome = await handleVerifiedPayment(providerRaw, verified);
      orderNo = outcome.orderNo;
      paid = outcome.paid;
    } catch (err) {
      if (!(err instanceof PaymentVerificationError) && !(err instanceof PaymentFlowError)) {
        console.error(`[payments] ${providerRaw} return handling failed:`, err);
      }
    }
  }

  const params = new URLSearchParams();
  if (orderNo) params.set("orderNo", orderNo);
  params.set("result", paid ? "success" : "failed");
  return NextResponse.redirect(new URL(`/payment/return?${params}`, request.url), 303);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  return handle(request, provider);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  return handle(request, provider);
}
