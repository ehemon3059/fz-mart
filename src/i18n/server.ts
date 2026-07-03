import { cookies } from "next/headers";
import { LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { en, type Dictionary } from "./dictionaries/en";
import { bn } from "./dictionaries/bn";
import { getLocalizationConfig } from "@/server/settings/localization";

// Server-side locale resolution: the visitor's cookie choice wins; otherwise
// the admin's configured default. Loaded once in the storefront layout and
// passed down (server components) / into the provider (client components).

const DICTIONARIES: Record<Locale, Dictionary> = { en, bn };

export interface LocalePrefs {
  locale: Locale;
  dict: Dictionary;
  banglaDigits: boolean;
}

export async function getLocalePrefs(): Promise<LocalePrefs> {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  const config = await getLocalizationConfig();
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : config.defaultLocale;
  return {
    locale,
    dict: DICTIONARIES[locale],
    // Bengali digits only make sense in the Bangla locale, and only when the
    // admin has turned the toggle on.
    banglaDigits: config.banglaDigits && locale === "bn",
  };
}

/** Just the dictionary for the current locale (server components). */
export async function getDictionary(): Promise<Dictionary> {
  return (await getLocalePrefs()).dict;
}
