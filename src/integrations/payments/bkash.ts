import { getPaymentsConfig } from "@/server/settings/payments";
import {
  type PaymentProviderAdapter,
  type InitiatePaymentInput,
  type InitiateResult,
  type VerifiedPayment,
  PaymentVerificationError,
  merchantTranId,
  paisaToTakaString,
  takaStringToPaisa,
  appBaseUrl,
} from "./types";

// bKash tokenized checkout (PGW). Flow:
//   1. grant token  → 2. create payment (returns bkashURL to redirect to)
//   3. customer approves in the bKash UI → browser lands on our callbackURL
//      with paymentID + status
//   4. we call EXECUTE server-side — that call (not the redirect params) is
//      what proves the money moved. Its trxID/amount are authoritative.
//
// Tokens are short-lived (~1h) and cheap to grant; volume is low enough that
// we grant per call instead of caching one across processes.

function baseUrl(sandbox: boolean): string {
  return sandbox
    ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
    : "https://tokenized.pay.bka.sh/v1.2.0-beta";
}

async function config() {
  const cfg = (await getPaymentsConfig()).bkash;
  if (!cfg.enabled || !cfg.appKey) {
    throw new PaymentVerificationError("bKash is not enabled/configured.");
  }
  return cfg;
}

type BkashConfig = Awaited<ReturnType<typeof config>>;

async function grantToken(cfg: BkashConfig): Promise<string> {
  const response = await fetch(`${baseUrl(cfg.sandbox)}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      username: cfg.username,
      password: cfg.password,
    },
    body: JSON.stringify({ app_key: cfg.appKey, app_secret: cfg.appSecret }),
  });
  if (!response.ok) {
    throw new Error(`bKash token grant responded ${response.status}`);
  }
  const data = await response.json();
  if (!data.id_token) {
    throw new Error(`bKash token grant failed: ${data.statusMessage ?? "no id_token"}`);
  }
  return String(data.id_token);
}

async function initiate(input: InitiatePaymentInput): Promise<InitiateResult> {
  const cfg = await config();
  const token = await grantToken(cfg);

  const response = await fetch(`${baseUrl(cfg.sandbox)}/tokenized/checkout/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      "X-APP-Key": cfg.appKey,
    },
    body: JSON.stringify({
      mode: "0011", // tokenized checkout (URL based)
      payerReference: input.customerPhone,
      callbackURL: `${appBaseUrl()}/api/payments/bkash/return`,
      amount: paisaToTakaString(input.amountPaisa),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: merchantTranId(input.paymentId),
    }),
  });
  if (!response.ok) {
    throw new Error(`bKash create payment responded ${response.status}`);
  }
  const data = await response.json();
  if (!data.paymentID || !data.bkashURL) {
    throw new Error(`bKash create payment failed: ${data.statusMessage ?? "no paymentID"}`);
  }
  // The callback only carries bKash's paymentID, so it's stored on our
  // Payment row (providerTxnId) to route the callback back to the order.
  return { gatewayUrl: String(data.bkashURL), providerRef: String(data.paymentID) };
}

async function verifyIpn(request: Request): Promise<VerifiedPayment> {
  const cfg = await config();
  const url = new URL(request.url);
  const paymentID = url.searchParams.get("paymentID");
  const status = url.searchParams.get("status"); // success | failure | cancel

  if (!paymentID) {
    throw new PaymentVerificationError("bKash callback missing paymentID.");
  }
  const ref = { kind: "providerRef", providerRef: paymentID } as const;
  const callbackParams = Object.fromEntries(url.searchParams.entries());

  if (status !== "success") {
    return { ref, outcome: "failed", providerTxnId: null, amountPaisa: null, raw: callbackParams };
  }

  // THE verification: execute the payment server-side. Only a Completed
  // execute response moves money — redirect params never do.
  const token = await grantToken(cfg);
  const response = await fetch(`${baseUrl(cfg.sandbox)}/tokenized/checkout/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      "X-APP-Key": cfg.appKey,
    },
    body: JSON.stringify({ paymentID }),
  });
  if (!response.ok) {
    throw new Error(`bKash execute responded ${response.status}`);
  }
  const execution = await response.json();

  const completed = execution.transactionStatus === "Completed" && execution.trxID;
  return {
    ref,
    outcome: completed ? "success" : "failed",
    providerTxnId: completed ? String(execution.trxID) : null,
    amountPaisa: completed ? takaStringToPaisa(execution.amount) : null,
    raw: { callback: callbackParams, execution },
  };
}

export const bkashAdapter: PaymentProviderAdapter = {
  key: "bkash",
  initiate,
  verifyIpn,
};
