"use client";

import { createContext, useContext } from "react";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";
import { formatMoney } from "./format";

// Client-side i18n context, seeded from the server in the storefront layout.
// Client components read the dictionary + formatting prefs from here rather
// than re-fetching.

interface I18nValue {
  locale: Locale;
  dict: Dictionary;
  banglaDigits: boolean;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  value,
  children,
}: {
  value: I18nValue;
  children: React.ReactNode;
}) {
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}

/** Convenience: format paisa using the current locale's digit preference. */
export function usePrice(): (paisa: number) => string {
  const { banglaDigits } = useI18n();
  return (paisa: number) => formatMoney(paisa, { banglaDigits });
}
