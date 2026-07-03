import { randomBytes } from "node:crypto";
import { getSetting, setSetting } from "@/lib/settings";

// Token that guards the marketing feed endpoints. Not a user secret — it's a
// capability URL shared with Facebook/Google Merchant — but kept out of the
// public catalogue so the feed (with sourcing-neutral data) isn't trivially
// scraped. Generated on first access and rotatable from the admin UI.

const GROUP = "feeds";
const KEY = "token";

export async function getFeedToken(): Promise<string> {
  const existing = await getSetting(GROUP, KEY);
  if (existing) return existing;
  const token = randomBytes(24).toString("hex");
  await setSetting({ group: GROUP, key: KEY, value: token });
  return token;
}

export async function regenerateFeedToken(): Promise<string> {
  const token = randomBytes(24).toString("hex");
  await setSetting({ group: GROUP, key: KEY, value: token });
  return token;
}

/** Length-checked comparison; returns false for any mismatch. */
export async function isValidFeedToken(candidate: string | null): Promise<boolean> {
  if (!candidate) return false;
  const token = await getFeedToken();
  return candidate.length === token.length && candidate === token;
}
