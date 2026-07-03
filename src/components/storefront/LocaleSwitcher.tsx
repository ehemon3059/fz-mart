"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_LABELS } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { setLocale } from "@/i18n/actions";

// EN / বাংলা toggle. Persists the choice in a cookie (server action) then
// refreshes so server components re-render in the new locale.
export default function LocaleSwitcher() {
  const { locale } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: string) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <span className="locale-switch" aria-label="Language">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          disabled={pending}
          aria-pressed={l === locale}
          className={l === locale ? "on" : ""}
        >
          {l === "bn" ? LOCALE_LABELS.bn : "EN"}
        </button>
      ))}
    </span>
  );
}
