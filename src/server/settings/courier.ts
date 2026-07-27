import { getSettingGroup, setSetting } from "@/lib/settings";

// Courier API credentials — stored encrypted, same pattern as SMTP/SMS.

const GROUP = "courier";

/** Providers the adapter knows how to talk to. "stub" = log-only (no apiUrl). */
export type CourierProvider = "steadfast" | "stub";

export interface CourierConfig {
  /** Which provider adapter to dispatch to. Empty string == legacy/stub. */
  provider: string;
  apiUrl: string;
  /** Primary credential. Steadfast: "Api-Key" header value. */
  apiKey: string;
  /** Secondary credential. Steadfast: "Secret-Key" header value. */
  secretKey: string;
  /** Shared secret used to verify webhook callback signatures. */
  webhookSecret: string;
  /**
   * Test mode. Steadfast has no sandbox server, so "test" does not point
   * elsewhere — it selects a local SIMULATOR adapter that fabricates
   * consignments without any HTTP call. Everything downstream (shipment rows,
   * order state machine, OrderStatusLog) runs for real.
   */
  testMode: boolean;
}

export async function getCourierConfig(): Promise<CourierConfig | null> {
  const settings = await getSettingGroup(GROUP);
  const testMode = settings.testMode === "true";
  // In test mode the simulator needs no credentials, so an empty apiKey is a
  // valid configuration. In live mode it still means "not configured".
  if (!settings.apiKey && !testMode) return null;

  return {
    provider: settings.provider ?? "",
    apiUrl: settings.apiUrl ?? "",
    apiKey: settings.apiKey ?? "",
    secretKey: settings.secretKey ?? "",
    webhookSecret: settings.webhookSecret ?? "",
    testMode,
  };
}

/** Whether Steadfast is currently in simulator mode. Cheap standalone read for
 *  the dispatch layer, which needs the flag but not the credentials. */
export async function isCourierTestMode(): Promise<boolean> {
  const settings = await getSettingGroup(GROUP);
  return settings.testMode === "true";
}

export async function saveCourierConfig(config: CourierConfig): Promise<void> {
  await Promise.all([
    setSetting({ group: GROUP, key: "provider", value: config.provider }),
    setSetting({ group: GROUP, key: "apiUrl", value: config.apiUrl }),
    setSetting({ group: GROUP, key: "apiKey", value: config.apiKey, encrypted: true }),
    setSetting({
      group: GROUP,
      key: "secretKey",
      value: config.secretKey,
      encrypted: true,
    }),
    setSetting({
      group: GROUP,
      key: "webhookSecret",
      value: config.webhookSecret,
      encrypted: true,
    }),
    setSetting({ group: GROUP, key: "testMode", value: String(config.testMode) }),
  ]);
}
