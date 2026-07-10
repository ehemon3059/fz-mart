import { getSetting, setSetting } from "@/lib/settings";

// GTM/Pixel ids are not secrets, so they're stored unencrypted in the
// generic Setting table under the "tracking" group.

const GROUP = "tracking";

export async function getGtmId(): Promise<string | null> {
  return getSetting(GROUP, "gtmId");
}

export async function setGtmId(id: string): Promise<void> {
  await setSetting({ group: GROUP, key: "gtmId", value: id });
}

export async function getPixelId(): Promise<string | null> {
  return getSetting(GROUP, "pixelId");
}

export async function setPixelId(id: string): Promise<void> {
  await setSetting({ group: GROUP, key: "pixelId", value: id });
}

// ── Conversions API (server-side events) ──
// The access token is a secret (it can send events as your pixel), so it is
// stored ENCRYPTED at rest. The test-event code is not a secret — it just
// routes events to the "Test Events" tab in Events Manager during setup.

export async function getCapiAccessToken(): Promise<string | null> {
  return getSetting(GROUP, "capiAccessToken");
}

export async function setCapiAccessToken(token: string): Promise<void> {
  await setSetting({ group: GROUP, key: "capiAccessToken", value: token, encrypted: true });
}

export async function getCapiTestEventCode(): Promise<string | null> {
  return getSetting(GROUP, "capiTestEventCode");
}

export async function setCapiTestEventCode(code: string): Promise<void> {
  await setSetting({ group: GROUP, key: "capiTestEventCode", value: code });
}

export interface CapiConfig {
  pixelId: string | null;
  accessToken: string | null;
  testEventCode: string | null;
}

/** Everything the server-side sender needs; enabled only when both ids exist. */
export async function getCapiConfig(): Promise<CapiConfig> {
  const [pixelId, accessToken, testEventCode] = await Promise.all([
    getPixelId(),
    getCapiAccessToken(),
    getCapiTestEventCode(),
  ]);
  return { pixelId, accessToken, testEventCode };
}
