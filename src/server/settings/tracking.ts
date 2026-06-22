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
