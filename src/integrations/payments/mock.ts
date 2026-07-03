import { getPaymentsConfig } from "@/server/settings/payments";
import {
  type PaymentProviderAdapter,
  type InitiatePaymentInput,
  type InitiateResult,
  type VerifiedPayment,
  PaymentVerificationError,
  appBaseUrl,
} from "./types";

// Fake gateway for e2e tests and local development: "redirects" to an
// internal page (/payment/mock) with Pay / Fail buttons that post back to the
// mock IPN route. Exercises the entire real pipeline — PENDING_PAYMENT order,
// Payment row, IPN verification path, markPaid/failPayment — with no network.
//
// It only works while the admin setting `payments.mockEnabled` is true; the
// verify step re-checks that flag so the route is inert in normal operation.

async function ensureEnabled() {
  const cfg = await getPaymentsConfig();
  if (!cfg.mock.enabled) {
    throw new PaymentVerificationError("Mock payment provider is not enabled.");
  }
}

async function initiate(input: InitiatePaymentInput): Promise<InitiateResult> {
  await ensureEnabled();
  const params = new URLSearchParams({
    paymentId: String(input.paymentId),
    amount: String(input.amountPaisa),
    orderNo: input.orderNo,
  });
  return {
    gatewayUrl: `${appBaseUrl()}/payment/mock?${params}`,
    providerRef: null,
  };
}

async function verifyIpn(request: Request): Promise<VerifiedPayment> {
  await ensureEnabled();
  const form = await request.formData();
  const paymentId = Number(form.get("paymentId"));
  const outcome = String(form.get("outcome"));
  const amountPaisa = Number(form.get("amount"));

  if (!Number.isInteger(paymentId) || paymentId <= 0) {
    throw new PaymentVerificationError("Mock IPN missing paymentId.");
  }
  const success = outcome === "success";
  return {
    ref: { kind: "paymentId", paymentId },
    outcome: success ? "success" : "failed",
    providerTxnId: success ? `MOCK-${paymentId}-${Date.now()}` : null,
    amountPaisa: success && Number.isFinite(amountPaisa) ? amountPaisa : null,
    raw: Object.fromEntries(form.entries()),
  };
}

export const mockAdapter: PaymentProviderAdapter = {
  key: "mock",
  initiate,
  verifyIpn,
};
