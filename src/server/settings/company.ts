import { getSettingGroup, setSetting } from "@/lib/settings";

// Storefront company/contact info shown in the footer (description, address,
// phone, email, social links), stored unencrypted in the generic Setting
// table under the "company" group. All optional — a blank field simply
// doesn't render (see Footer.tsx), so the storefront never shows a broken
// link or empty placeholder text.

const GROUP = "company";

export interface CompanyInfo {
  description: string;
  address: string;
  phone: string;
  email: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  twitterUrl: string;
  /** Footer copyright line, without the leading "©" or year — e.g. "FZ Mart". */
  copyrightText: string;
}

const DEFAULTS: CompanyInfo = {
  description: "",
  address: "",
  phone: "",
  email: "",
  facebookUrl: "",
  instagramUrl: "",
  youtubeUrl: "",
  twitterUrl: "",
  copyrightText: "FZ Mart",
};

export async function getCompanyInfo(): Promise<CompanyInfo> {
  const g = await getSettingGroup(GROUP);
  return {
    description: g.description ?? DEFAULTS.description,
    address: g.address ?? DEFAULTS.address,
    phone: g.phone ?? DEFAULTS.phone,
    email: g.email ?? DEFAULTS.email,
    facebookUrl: g.facebookUrl ?? DEFAULTS.facebookUrl,
    instagramUrl: g.instagramUrl ?? DEFAULTS.instagramUrl,
    youtubeUrl: g.youtubeUrl ?? DEFAULTS.youtubeUrl,
    twitterUrl: g.twitterUrl ?? DEFAULTS.twitterUrl,
    copyrightText: g.copyrightText || DEFAULTS.copyrightText,
  };
}

export async function saveCompanyInfo(info: CompanyInfo): Promise<void> {
  const set = (key: string, value: string) => setSetting({ group: GROUP, key, value: value.trim() });
  await Promise.all([
    set("description", info.description),
    set("address", info.address),
    set("phone", info.phone),
    set("email", info.email),
    set("facebookUrl", info.facebookUrl),
    set("instagramUrl", info.instagramUrl),
    set("youtubeUrl", info.youtubeUrl),
    set("twitterUrl", info.twitterUrl),
    set("copyrightText", info.copyrightText),
  ]);
}
