import { getSettingGroup, setSetting } from "@/lib/settings";

// SMS gateway credentials — stored encrypted, same pattern as SMTP.

const GROUP = "sms";

export interface SmsConfig {
  apiUrl: string;
  apiKey: string;
  senderId: string;
}

export async function getSmsConfig(): Promise<SmsConfig | null> {
  const settings = await getSettingGroup(GROUP);
  if (!settings.apiKey) return null;

  return {
    apiUrl: settings.apiUrl ?? "",
    apiKey: settings.apiKey,
    senderId: settings.senderId ?? "",
  };
}

export async function saveSmsConfig(config: SmsConfig): Promise<void> {
  await Promise.all([
    setSetting({ group: GROUP, key: "apiUrl", value: config.apiUrl }),
    setSetting({ group: GROUP, key: "apiKey", value: config.apiKey, encrypted: true }),
    setSetting({ group: GROUP, key: "senderId", value: config.senderId }),
  ]);
}
