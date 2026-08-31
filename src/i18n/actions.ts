"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, isLocale } from "./config";
import { shouldUseSecureCookies } from "@/lib/cookie-security";

/** Persist the visitor's locale choice for a year. */
export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    // Not a credential, but it rides the same connection as one: a cookie sent
    // in cleartext still confirms to a network observer that a session exists.
    // httpOnly is deliberately NOT set — no client code reads it today, but
    // locale is presentation state, not a secret, and keeping it readable
    // leaves room for a client-side switcher without weakening anything.
    secure: await shouldUseSecureCookies(),
  });
}
