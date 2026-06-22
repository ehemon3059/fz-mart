import { getSettingGroup, setSetting } from "@/lib/settings";

// Courier API credentials — stored encrypted, same pattern as SMTP/SMS.

const GROUP = "courier";

export interface CourierConfig {
  provider: string;
  apiUrl: string;
  apiKey: string;
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
      key: "webhookSecret",
      value: config.webhookSecret,
      encrypted: true,
    }),
  ]);
}
