import { getSetting, setSetting } from "@/lib/settings";

// Storefront branding assets (currently just the logo), stored unencrypted in
// the generic Setting table under the "branding" group. Falls back to null —
// the storefront then renders its built-in text wordmark.

const GROUP = "branding";
const LOGO_KEY = "logoUrl";

/** Public URL of the uploaded logo, or null when the admin hasn't set one. */
export async function getLogoUrl(): Promise<string | null> {
  const url = await getSetting(GROUP, LOGO_KEY);
  return url && url.trim() ? url : null;
}

/** Store the logo URL, or clear it back to the default wordmark when empty. */
export async function setLogoUrl(url: string): Promise<void> {
  await setSetting({ group: GROUP, key: LOGO_KEY, value: url.trim() });
}
