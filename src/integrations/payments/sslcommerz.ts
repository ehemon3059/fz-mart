import { getPaymentsConfig } from "@/server/settings/payments";
import {
  type PaymentProviderAdapter,
  type InitiatePaymentInput,
  type InitiateResult,
  type VerifiedPayment,
  PaymentVerificationError,
  merchantTranId,
  parseMerchantTranId,
  paisaToTakaString,
  takaStringToPaisa,
  appBaseUrl,
} from "./types";

// SSLCommerz hosted checkout (v4 gwprocess). One integration covers cards,
// bKash, Nagad, Rocket and bank wallets — the customer picks on SSLCommerz's
// hosted page.
//
// Verification model: the browser redirect (success_url) and the IPN both
// carry a `val_id`; NEITHER is trusted. We take the val_id and call the
// Validation API with our store credentials — only its answer (status
// VALID/VALIDATED + matching amount) marks a payment paid.

function baseUrl(sandbox: boolean): string {
  return sandbox ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com";
}

async function config() {
  const cfg = (await getPaymentsConfig()).sslcommerz;
  if (!cfg.enabled || !cfg.storeId) {
    throw new PaymentVerificationError("SSLCommerz is not enabled/configured.");
  }
  return cfg;
}

async function initiate(input: InitiatePaymentInput): Promise<InitiateResult> {
  const cfg = await config();
  const app = appBaseUrl();

  const body = new URLSearchParams({
    store_id: cfg.storeId,
    store_passwd: cfg.storePassword,
    total_amount: paisaToTakaString(input.amountPaisa),
    currency: "BDT",
    tran_id: merchantTranId(input.paymentId),
    // The customer's browser comes back through these; they re-verify via the
    // Validation API exactly like the IPN does.
    success_url: `${app}/api/payments/sslcommerz/return`,
    fail_url: `${app}/api/payments/sslcommerz/return`,
    cancel_url: `${app}/api/payments/sslcommerz/return`,
    ipn_url: `${app}/api/payments/sslcommerz/ipn`,
    cus_name: input.customerName,
    cus_email: input.customerEmail || "no-email@fz-mart.local",
    cus_phone: input.customerPhone,
    cus_add1: "N/A",
    cus_city: "N/A",
    cus_country: "Bangladesh",
    shipping_method: "NO",
    product_name: `Order ${input.orderNo}`,
    product_category: "ecommerce",
    product_profile: "general",
  });

  const response = await fetch(`${baseUrl(cfg.sandbox)}/gwprocess/v4/api.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error(`SSLCommerz session API responded ${response.status}`);
  }
  const data = await response.json();
  if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
    throw new Error(
      `SSLCommerz refused to create a session: ${data.failedreason ?? data.status}`,
    );
  }
  return { gatewayUrl: String(data.GatewayPageURL), providerRef: null };
}

async function verifyIpn(request: Request): Promise<VerifiedPayment> {
  const cfg = await config();
  const form = await request.formData();
  const tranId = String(form.get("tran_id") ?? "");
  const valId = String(form.get("val_id") ?? "");
  const gatewayStatus = String(form.get("status") ?? "");

  const paymentId = parseMerchantTranId(tranId);
  if (paymentId == null) {
    throw new PaymentVerificationError(`Unrecognised tran_id: ${tranId}`);
  }
  const ref = { kind: "paymentId", paymentId } as const;
  const postedPayload = Object.fromEntries(form.entries());

  // FAILED/CANCELLED callbacks carry no val_id worth validating — record the
  // failure (idempotently; a later successful attempt is a new Payment row).
  if (!valId || gatewayStatus === "FAILED" || gatewayStatus === "CANCELLED") {
    return { ref, outcome: "failed", providerTxnId: null, amountPaisa: null, raw: postedPayload };
  }

  // THE verification: ask SSLCommerz's server about this val_id.
  const query = new URLSearchParams({
    val_id: valId,
    store_id: cfg.storeId,
    store_passwd: cfg.storePassword,
    format: "json",
  });
  const response = await fetch(
    `${baseUrl(cfg.sandbox)}/validator/api/validationserverAPI.php?${query}`,
  );
  if (!response.ok) {
    throw new Error(`SSLCommerz validation API responded ${response.status}`);
  }
  const validation = await response.json();

  const valid = validation.status === "VALID" || validation.status === "VALIDATED";
  return {
    ref,
    outcome: valid ? "success" : "failed",
    providerTxnId: valid ? String(validation.val_id ?? valId) : null,
    // `amount` is the taka figure the gateway actually settled.
    amountPaisa: valid ? takaStringToPaisa(validation.amount) : null,
    raw: { posted: postedPayload, validation },
  };
}

export const sslcommerzAdapter: PaymentProviderAdapter = {
  key: "sslcommerz",
  initiate,
  verifyIpn,
};
