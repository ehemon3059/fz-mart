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
}

export async function getCourierConfig(): Promise<CourierConfig | null> {
  const settings = await getSettingGroup(GROUP);
  if (!settings.apiKey) return null;

  return {
    provider: settings.provider ?? "",
    apiUrl: settings.apiUrl ?? "",
    apiKey: settings.apiKey,
    secretKey: settings.secretKey ?? "",
    webhookSecret: settings.webhookSecret ?? "",
  };
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
  ]);
}
