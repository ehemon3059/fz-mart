import { getSettingGroup, setSetting } from "@/lib/settings";

// SMTP credentials are secrets — stored encrypted via lib/crypto.ts (the
// `encrypted: true` flag on the password field below).

const GROUP = "smtp";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromAddress: string;
  fromName: string;
}

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const settings = await getSettingGroup(GROUP);
  if (!settings.host) return null;

  return {
    host: settings.host,
    port: Number(settings.port ?? 587),
    secure: settings.secure === "true",
    user: settings.user ?? "",
    password: settings.password ?? "",
    fromAddress: settings.fromAddress ?? "",
    fromName: settings.fromName ?? "fz-mart",
  };
}

export async function saveSmtpConfig(config: SmtpConfig): Promise<void> {
  await Promise.all([
    setSetting({ group: GROUP, key: "host", value: config.host }),
    setSetting({ group: GROUP, key: "port", value: String(config.port) }),
    setSetting({ group: GROUP, key: "secure", value: String(config.secure) }),
    setSetting({ group: GROUP, key: "user", value: config.user }),
    setSetting({
      group: GROUP,
      key: "password",
      value: config.password,
      encrypted: true,
    }),
    setSetting({ group: GROUP, key: "fromAddress", value: config.fromAddress }),
    setSetting({ group: GROUP, key: "fromName", value: config.fromName }),
  ]);
}
