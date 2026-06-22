import { getSettingGroup, setSetting } from "@/lib/settings";

const GROUP = "fraud";

export interface FraudConfig {
  apiUrl: string;
  apiKey: string;
}

export async function getFraudConfig(): Promise<FraudConfig | null> {
  const settings = await getSettingGroup(GROUP);
  if (!settings.apiKey) return null;

  return {
    apiUrl: settings.apiUrl ?? "",
    apiKey: settings.apiKey,
  };
}

export async function saveFraudConfig(config: FraudConfig): Promise<void> {
  await Promise.all([
    setSetting({ group: GROUP, key: "apiUrl", value: config.apiUrl }),
    setSetting({ group: GROUP, key: "apiKey", value: config.apiKey, encrypted: true }),
  ]);
}
