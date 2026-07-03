import { getSettingGroup, setSetting } from "@/lib/settings";

// Online-payment gateway configuration — same encrypted-settings pattern as
// SMTP/SMS/courier. Two real providers (SSLCommerz hosted checkout, bKash
// tokenized PGW) plus a mock provider for e2e/dev.
//
// Gateway fees are stored in BASIS POINTS (1 bps = 0.01%) so the per-order
// fee can be derived as integer math on paisa — no floats near money.

const GROUP = "payments";

export const PAYMENT_PROVIDER_KEYS = ["sslcommerz", "bkash", "mock"] as const;
export type PaymentProviderKey = (typeof PAYMENT_PROVIDER_KEYS)[number];

export function isPaymentProviderKey(value: string): value is PaymentProviderKey {
  return (PAYMENT_PROVIDER_KEYS as readonly string[]).includes(value);
}

export interface PaymentsConfig {
  /** Master switch for the whole online-payment feature. */
  onlineEnabled: boolean;
  /** Allow "pay delivery charge now, rest COD" (partial advance). */
  partialEnabled: boolean;

  sslcommerz: {
    enabled: boolean;
    sandbox: boolean;
    storeId: string;
    storePassword: string; // encrypted at rest
    /** Gateway fee in basis points, e.g. 250 = 2.5%. Feeds the P&L. */
    feeBps: number;
  };
  bkash: {
    enabled: boolean;
    sandbox: boolean;
    appKey: string;
    appSecret: string; // encrypted at rest
    username: string;
    password: string; // encrypted at rest
    feeBps: number;
  };
  mock: {
    /** Dev/e2e only — a fake gateway page inside this app. Never enable in production. */
    enabled: boolean;
    feeBps: number;
  };
}

function toBool(value: string | undefined): boolean {
  return value === "true";
}

function toBps(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

export async function getPaymentsConfig(): Promise<PaymentsConfig> {
  const s = await getSettingGroup(GROUP);
  return {
    onlineEnabled: toBool(s.onlineEnabled),
    partialEnabled: toBool(s.partialEnabled),
    sslcommerz: {
      enabled: toBool(s.sslcommerzEnabled),
      sandbox: s.sslcommerzSandbox !== "false", // default sandbox until told otherwise
      storeId: s.sslcommerzStoreId ?? "",
      storePassword: s.sslcommerzStorePassword ?? "",
      feeBps: toBps(s.sslcommerzFeeBps),
    },
    bkash: {
      enabled: toBool(s.bkashEnabled),
      sandbox: s.bkashSandbox !== "false",
      appKey: s.bkashAppKey ?? "",
      appSecret: s.bkashAppSecret ?? "",
      username: s.bkashUsername ?? "",
      password: s.bkashPassword ?? "",
      feeBps: toBps(s.bkashFeeBps),
    },
    mock: {
      enabled: toBool(s.mockEnabled),
      feeBps: toBps(s.mockFeeBps),
    },
  };
}

export async function savePaymentsConfig(config: PaymentsConfig): Promise<void> {
  const set = (key: string, value: string, encrypted = false) =>
    setSetting({ group: GROUP, key, value, encrypted });

  await Promise.all([
    set("onlineEnabled", String(config.onlineEnabled)),
    set("partialEnabled", String(config.partialEnabled)),

    set("sslcommerzEnabled", String(config.sslcommerz.enabled)),
    set("sslcommerzSandbox", String(config.sslcommerz.sandbox)),
    set("sslcommerzStoreId", config.sslcommerz.storeId),
    set("sslcommerzStorePassword", config.sslcommerz.storePassword, true),
    set("sslcommerzFeeBps", String(config.sslcommerz.feeBps)),

    set("bkashEnabled", String(config.bkash.enabled)),
    set("bkashSandbox", String(config.bkash.sandbox)),
    set("bkashAppKey", config.bkash.appKey),
    set("bkashAppSecret", config.bkash.appSecret, true),
    set("bkashUsername", config.bkash.username),
    set("bkashPassword", config.bkash.password, true),
    set("bkashFeeBps", String(config.bkash.feeBps)),

    set("mockEnabled", String(config.mock.enabled)),
    set("mockFeeBps", String(config.mock.feeBps)),
  ]);
}

export interface EnabledProvider {
  key: PaymentProviderKey;
  label: string;
}

const PROVIDER_LABELS: Record<PaymentProviderKey, string> = {
  sslcommerz: "Card / bKash / Nagad / Rocket (SSLCommerz)",
  bkash: "bKash",
  mock: "Test Gateway (mock)",
};

/**
 * What the checkout page needs to render the payment choices: nothing
 * secret, safe to pass to a client component.
 */
export interface CheckoutPaymentOptions {
  onlineEnabled: boolean;
  partialEnabled: boolean;
  providers: EnabledProvider[];
}

export async function getCheckoutPaymentOptions(): Promise<CheckoutPaymentOptions> {
  const config = await getPaymentsConfig();
  const providers: EnabledProvider[] = [];
  if (config.sslcommerz.enabled && config.sslcommerz.storeId) {
    providers.push({ key: "sslcommerz", label: PROVIDER_LABELS.sslcommerz });
  }
  if (config.bkash.enabled && config.bkash.appKey) {
    providers.push({ key: "bkash", label: PROVIDER_LABELS.bkash });
  }
  if (config.mock.enabled) {
    providers.push({ key: "mock", label: PROVIDER_LABELS.mock });
  }
  const onlineEnabled = config.onlineEnabled && providers.length > 0;
  return {
    onlineEnabled,
    partialEnabled: onlineEnabled && config.partialEnabled,
    providers: onlineEnabled ? providers : [],
  };
}

/** Fee (paisa) the gateway keeps on a paid amount, from the provider's bps. */
export function gatewayFeeFor(config: PaymentsConfig, provider: PaymentProviderKey, amountPaisa: number): number {
  const bps = config[provider].feeBps;
  return Math.round((amountPaisa * bps) / 10000);
}
