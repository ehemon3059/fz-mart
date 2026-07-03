import type { PaymentProviderKey } from "@/server/settings/payments";

// Generic payment-gateway adapter interface, same philosophy as the courier
// adapter: every provider-specific request/response shape is translated
// to/from these types right at the adapter boundary, so the service layer
// (server/payments/), routes, and admin UI never change per provider.
//
// SECURITY INVARIANT: verifyIpn must confirm the payment with the PROVIDER'S
// SERVER (validation API / execute call) — the browser redirect and even the
// raw IPN body are attacker-suppliable and are never trusted on their own.

export interface InitiatePaymentInput {
  /** Our Payment row id — becomes the merchant transaction reference. */
  paymentId: number;
  orderNo: string;
  /** Amount to collect online, paisa. */
  amountPaisa: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
}

export interface InitiateResult {
  /** Where to send the customer's browser. */
  gatewayUrl: string;
  /**
   * Provider-side id assigned at initiation (e.g. bKash paymentID), stored on
   * the Payment row so the callback can find it. Null when the provider works
   * off our merchant reference instead (SSLCommerz tran_id).
   */
  providerRef: string | null;
}

/** How a verified callback identifies which Payment row it belongs to. */
export type PaymentRef =
  | { kind: "paymentId"; paymentId: number }
  | { kind: "providerRef"; providerRef: string };

export interface VerifiedPayment {
  ref: PaymentRef;
  outcome: "success" | "failed";
  /** Final provider transaction id (val_id / trxID) — null on failure. */
  providerTxnId: string | null;
  /** Amount the provider confirms was paid (paisa) — cross-checked against our row. */
  amountPaisa: number | null;
  /** Verbatim provider payload, persisted for dispute evidence. */
  raw: unknown;
}

export class PaymentVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentVerificationError";
  }
}

export interface PaymentProviderAdapter {
  key: PaymentProviderKey;
  initiate(input: InitiatePaymentInput): Promise<InitiateResult>;
  /**
   * Parse an incoming IPN/callback request and verify it server-side with
   * the provider. Throws PaymentVerificationError when the request can't be
   * attributed to a payment at all (bad/missing fields, provider disabled).
   */
  verifyIpn(request: Request): Promise<VerifiedPayment>;
}

/** Merchant transaction id we hand to gateways, reversible back to Payment.id. */
export function merchantTranId(paymentId: number): string {
  return `FZPAY-${paymentId}`;
}

export function parseMerchantTranId(tranId: string): number | null {
  const match = /^FZPAY-(\d+)$/.exec(tranId);
  return match ? Number(match[1]) : null;
}

/** Gateways speak taka with decimals; we speak integer paisa. */
export function paisaToTakaString(paisa: number): string {
  return (paisa / 100).toFixed(2);
}

export function takaStringToPaisa(taka: string | number): number {
  return Math.round(Number(taka) * 100);
}

export function appBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL is not set — required for payment callbacks.");
  return url.replace(/\/$/, "");
}
