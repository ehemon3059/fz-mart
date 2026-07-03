"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { LOCALES, LOCALE_LABELS } from "@/i18n/config";
import type { LocalizationConfig } from "@/server/settings/localization";
import { saveLocalizationSettings } from "./actions";

export default function LocalizationForm({ config }: { config: LocalizationConfig }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const res = await saveLocalizationSettings(formData);
      if (res?.error) setError(res.error);
      else setSaved(true);
    });
  }

  return (
    <form action={handleSubmit} className="max-w-md space-y-5 rounded-xl border border-stone-200 bg-white p-5 shadow-soft">
      <div>
        <label className="mb-1 block text-[13px] font-semibold text-stone-700">Default language</label>
        <select
          name="defaultLocale"
          defaultValue={config.defaultLocale}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
        >
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {LOCALE_LABELS[l]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[12px] text-stone-400">Used until a visitor picks a language from the switcher.</p>
      </div>

      <label className="flex items-start gap-2.5">
        <input type="checkbox" name="banglaDigits" defaultChecked={config.banglaDigits} className="mt-1" />
        <span>
          <span className="block text-[13.5px] font-semibold text-stone-700">Bangla digits for prices</span>
          <span className="block text-[12px] text-stone-400">
            Show prices with Bengali numerals (৳১,১৯৯) when the storefront is in Bangla.
          </span>
        </span>
      </label>

      {error && <p className="text-[13px] text-red-600">{error}</p>}
      {saved && (
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-brand-600">
          <Icon name="check" size={14} strokeWidth={2.6} /> Saved.
        </p>
      )}

      <button type="submit" disabled={pending} className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
        <Icon name="save" size={16} />
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
