// Storefront i18n config. We use a cookie-based locale (NEXT_LOCALE) read in
// the storefront layout rather than a [locale] URL segment — the latter would
// force restructuring every storefront route, and for a two-locale COD shop a
// cookie is the lighter, well-trodden App-Router pattern. Product CONTENT is
// never translated here (admins write Bangla directly); only UI chrome is.

export const LOCALES = ["en", "bn"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_COOKIE = "NEXT_LOCALE";
export const FALLBACK_LOCALE: Locale = "en";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "bn";
}

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  bn: "বাংলা",
};
