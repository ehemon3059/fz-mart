import { NextResponse, type NextRequest } from "next/server";
import { getPaymentAdapter, PaymentVerificationError } from "@/integrations/payments";
import { handleVerifiedPayment, PaymentFlowError } from "@/server/payments";
import { isPaymentProviderKey } from "@/server/settings/payments";

// Server-to-server IPN endpoint (SSLCommerz `ipn_url`, mock gateway). Public
// by necessity — authenticity comes from the adapter's verifyIpn, which
// confirms every notification with the provider's own API before anything is
// trusted. Idempotent: providers retry, and the browser-return route may have
// already settled the same payment.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!isPaymentProviderKey(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  try {
    const verified = await getPaymentAdapter(provider).verifyIpn(request);
    const outcome = await handleVerifiedPayment(provider, verified);
    return NextResponse.json({ ok: true, paid: outcome.paid });
  } catch (err) {
    if (err instanceof PaymentVerificationError || err instanceof PaymentFlowError) {
      // Unattributable/invalid notification — acknowledge with 400 so a
      // legitimate provider stops retrying garbage.
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(`[payments] IPN handling failed (${provider}):`, err);
    // Transient failure (gateway validation API down, DB hiccup) — 500 so
    // the provider retries later.
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
