import type { Locale } from "./config";
import { paisaToTaka } from "@/lib/money";

// Locale-aware formatting for the storefront. Pure functions so both server
// and client can use them.

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** Convert ASCII digits in a string to Bengali digits. */
export function toBanglaDigits(input: string): string {
  return input.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

export interface MoneyOpts {
  banglaDigits?: boolean;
}

/** Format paisa as a Taka price string, optionally with Bengali digits. */
export function formatMoney(paisa: number, opts: MoneyOpts = {}): string {
  const value = paisaToTaka(paisa).toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const rendered = opts.banglaDigits ? toBanglaDigits(value) : value;
  return `৳${rendered}`;
}

/** Locale-aware date formatting (bn-BD renders month names + digits in Bangla). */
export function formatDateLocale(date: Date | string, locale: Locale): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale === "bn" ? "bn-BD" : "en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
