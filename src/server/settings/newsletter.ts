import { getSettingGroup, setSetting } from "@/lib/settings";

// Editable copy for the storefront newsletter signup box (the "Get ৳150 off"
// banner). Stored unencrypted in the generic Setting table under the
// "newsletter" group, with the previous hardcoded strings as defaults so the
// box reads identically until an admin changes it.

const GROUP = "newsletter";

export interface NewsletterCopy {
  title: string;
  subtitle: string;
}

export const NEWSLETTER_DEFAULTS: NewsletterCopy = {
  title: "Get ৳150 off your first order",
  subtitle: "Subscribe for exclusive deals, new arrivals and early access to flash sales.",
};

export async function getNewsletterCopy(): Promise<NewsletterCopy> {
  const g = await getSettingGroup(GROUP);
  return {
    title: g.title?.trim() || NEWSLETTER_DEFAULTS.title,
    subtitle: g.subtitle?.trim() || NEWSLETTER_DEFAULTS.subtitle,
  };
}

export async function saveNewsletterCopy(copy: NewsletterCopy): Promise<void> {
  await Promise.all([
    setSetting({ group: GROUP, key: "title", value: copy.title.trim() }),
    setSetting({ group: GROUP, key: "subtitle", value: copy.subtitle.trim() }),
  ]);
}
