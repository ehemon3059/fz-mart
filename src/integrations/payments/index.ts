import type { PaymentProviderKey } from "@/server/settings/payments";
import type { PaymentProviderAdapter } from "./types";
import { sslcommerzAdapter } from "./sslcommerz";
import { bkashAdapter } from "./bkash";
import { mockAdapter } from "./mock";

export * from "./types";

const ADAPTERS: Record<PaymentProviderKey, PaymentProviderAdapter> = {
  sslcommerz: sslcommerzAdapter,
  bkash: bkashAdapter,
  mock: mockAdapter,
};

export function getPaymentAdapter(key: PaymentProviderKey): PaymentProviderAdapter {
  return ADAPTERS[key];
}
