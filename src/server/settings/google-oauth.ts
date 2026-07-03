import { getSettingGroup, setSetting } from "@/lib/settings";

// Google OAuth client credentials — the client secret is stored encrypted
// via lib/crypto.ts (the `encrypted: true` flag below), same as SMTP.

const GROUP = "google_oauth";

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export async function getGoogleOAuthConfig(): Promise<GoogleOAuthConfig | null> {
  const settings = await getSettingGroup(GROUP);
  if (!settings.clientId) return null;

  return {
    clientId: settings.clientId,
    clientSecret: settings.clientSecret ?? "",
    redirectUri: settings.redirectUri ?? "",
  };
}

export async function saveGoogleOAuthConfig(config: GoogleOAuthConfig): Promise<void> {
  await Promise.all([
    setSetting({ group: GROUP, key: "clientId", value: config.clientId }),
    setSetting({
      group: GROUP,
      key: "clientSecret",
      value: config.clientSecret,
      encrypted: true,
    }),
    setSetting({ group: GROUP, key: "redirectUri", value: config.redirectUri }),
  ]);
}
