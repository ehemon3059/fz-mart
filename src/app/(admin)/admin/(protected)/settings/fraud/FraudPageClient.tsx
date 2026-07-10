"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { saveFraudSettings } from "./actions";
import { FRAUD_COPY, type FraudLang } from "./content";

const CARD_ICONS = ["shield", "warn", "globe", "settings"] as const;

interface Props {
  config: { apiUrl: string } | null;
}

export default function FraudPageClient({ config }: Props) {
  const [lang, setLang] = useState<FraudLang>("en");
  const t = FRAUD_COPY[lang];

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-8 pb-28 sm:px-7 lg:pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
            {t.heading}
          </h1>
          <p className="mt-1 text-[13.5px] text-stone-500 sm:text-[14.5px]">
            {config ? t.configured : t.notConfigured}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setLang((l) => (l === "en" ? "bn" : "en"))}
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-stone-700 shadow-soft hover:bg-stone-50"
        >
          <Icon name="globe" size={15} />
          {t.toggleLabel}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {t.cards.map((card, i) => (
          <div key={i} className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon name={CARD_ICONS[i]} size={18} />
            </div>
            <h3 className="mt-3 text-[14.5px] font-bold text-stone-800">{card.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-stone-500">{card.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <FraudForm config={config} t={t.form} />
      </div>
    </div>
  );
}

function FraudForm({
  config,
  t,
}: {
  config: { apiUrl: string } | null;
  t: (typeof FRAUD_COPY)[FraudLang]["form"];
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await saveFraudSettings(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
      <h2 className="text-[15px] font-bold text-stone-800">{t.heading}</h2>
      <p className="mt-1 text-[13px] text-stone-400">{t.subtitle}</p>

      <form action={handleSubmit} className="mt-4 max-w-md space-y-4">
        <div>
          <label className="mb-1 block text-[13px] font-semibold text-stone-700">{t.apiUrlLabel}</label>
          <input
            name="apiUrl"
            defaultValue={config?.apiUrl}
            placeholder={t.apiUrlPlaceholder}
            className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-[14px] text-stone-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <p className="mt-1 text-[12px] text-stone-400">{t.apiUrlHelp}</p>
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-semibold text-stone-700">{t.apiKeyLabel}</label>
          <input
            name="apiKey"
            type="password"
            placeholder={config ? t.apiKeyKeepPlaceholder : t.apiKeyPlaceholder}
            className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-[14px] text-stone-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {error && <p className="text-[13px] text-red-600">{error}</p>}
        {success && (
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-brand-600">
            <Icon name="check" size={14} strokeWidth={2.6} /> {t.saved}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-600 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 sm:w-auto sm:px-5"
        >
          <Icon name="save" size={16} />
          {pending ? t.saving : t.save}
        </button>
      </form>
    </div>
  );
}
