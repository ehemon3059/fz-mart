import { getSettingGroup, setSetting } from "@/lib/settings";
import { FALLBACK_LOCALE, isLocale, type Locale } from "@/i18n/config";

// Admin-controlled localization defaults, stored in the "localization" group.

const GROUP = "localization";

export interface LocalizationConfig {
  /** Locale used when the visitor hasn't picked one via the switcher. */
  defaultLocale: Locale;
  /** Render prices (and Bangla-locale numbers) with Bengali digits (০-৯). */
  banglaDigits: boolean;
}

export async function getLocalizationConfig(): Promise<LocalizationConfig> {
  const g = await getSettingGroup(GROUP);
  return {
    defaultLocale: isLocale(g.defaultLocale) ? g.defaultLocale : FALLBACK_LOCALE,
    banglaDigits: g.banglaDigits === "true",
  };
}

export async function saveLocalizationConfig(config: LocalizationConfig): Promise<void> {
  await Promise.all([
    setSetting({ group: GROUP, key: "defaultLocale", value: config.defaultLocale }),
    setSetting({ group: GROUP, key: "banglaDigits", value: String(config.banglaDigits) }),
  ]);
}
