"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { saveConversionSettings } from "./actions";
import { buildCopy, type ConversionCopy, type ConversionLang } from "./content";

const input = "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900";

interface Config {
  otpEnabled: boolean;
  returnWindowDays: number;
  abandonedCartEnabled: boolean;
  abandonedCartDelayHours: number;
  abandonedCartMessage: string;
}

export default function ConversionPageClient({ config }: { config: Config }) {
  const [lang, setLang] = useState<ConversionLang>("en");
  const t = buildCopy(lang);

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-8 pb-28 sm:px-7 lg:pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
            {t.heading}
          </h1>
          <p className="mt-1 text-[13.5px] text-stone-500 sm:text-[14.5px]">{t.intro}</p>
        </div>

        <button
          type="button"
          onClick={() => setLang((l) => (l === "en" ? "bn" : "en"))}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-stone-700 shadow-soft hover:bg-stone-50"
        >
          <Icon name="globe" size={15} />
          {t.toggleLabel}
        </button>
      </div>

      {/* What / How / Why explainer */}
      <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50/70 p-5 sm:p-6">
        <h2 className="text-[15px] font-bold text-stone-900">{t.explainer.heading}</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-stone-600">{t.explainer.body}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <ExplainerColumn title={t.explainer.applyTitle} items={t.explainer.applyItems} />
          <ExplainerColumn title={t.explainer.whyTitle} items={t.explainer.whyItems} />
          <ExplainerColumn title={t.explainer.whereTitle} items={t.explainer.whereItems} />
        </div>
      </div>

      <div className="mt-6">
        <ConversionForm config={config} t={t.form} />
      </div>
    </div>
  );
}

function ExplainerColumn({ title, items }: { title: string; items: ConversionCopy["explainer"]["applyItems"] }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <p className="text-[12px] font-bold uppercase tracking-wide text-stone-400">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] text-stone-600">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ConversionForm({ config, t }: { config: Config; t: ConversionCopy["form"] }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await saveConversionSettings(formData);
      if (res?.error) setError(res.error);
      else setSuccess(true);
    });
  }

  return (
    <form action={handleSubmit} className="max-w-xl space-y-6">
      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-[15px] font-bold text-stone-800">{t.otpHeading}</h2>
        <label className="mt-3 flex items-start gap-2.5">
          <input type="checkbox" name="otpEnabled" defaultChecked={config.otpEnabled} className="mt-1" />
          <span>
            <span className="block text-[13.5px] font-semibold text-stone-700">{t.otpLabel}</span>
            <span className="block text-[12px] text-stone-400">{t.otpHelp}</span>
          </span>
        </label>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-[15px] font-bold text-stone-800">{t.returnsHeading}</h2>
        <label className="mb-1 mt-3 block text-[13px] font-semibold text-stone-700">{t.returnWindowLabel}</label>
        <input
          name="returnWindowDays"
          inputMode="numeric"
          defaultValue={config.returnWindowDays}
          className={`${input} w-32`}
        />
        <p className="mt-1 text-[12px] text-stone-400">{t.returnWindowHelp}</p>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-[15px] font-bold text-stone-800">{t.cartHeading}</h2>
        <label className="mt-3 flex items-start gap-2.5">
          <input type="checkbox" name="abandonedCartEnabled" defaultChecked={config.abandonedCartEnabled} className="mt-1" />
          <span>
            <span className="block text-[13.5px] font-semibold text-stone-700">{t.cartToggleLabel}</span>
            <span className="block text-[12px] text-stone-400">{t.cartToggleHelp}</span>
          </span>
        </label>
        <div className="mt-4">
          <label className="mb-1 block text-[13px] font-semibold text-stone-700">{t.cartDelayLabel}</label>
          <input name="abandonedCartDelayHours" inputMode="numeric" defaultValue={config.abandonedCartDelayHours} className={`${input} w-32`} />
        </div>
        <div className="mt-4">
          <label className="mb-1 block text-[13px] font-semibold text-stone-700">{t.cartMessageLabel}</label>
          <textarea name="abandonedCartMessage" rows={2} defaultValue={config.abandonedCartMessage} className={input} />
          <p className="mt-1 text-[12px] text-stone-400">{t.cartMessageHelp}</p>
        </div>
      </section>

      {error && <p className="text-[13px] text-red-600">{error}</p>}
      {success && (
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-brand-600">
          <Icon name="check" size={14} strokeWidth={2.6} /> {t.saved}
        </p>
      )}

      <button type="submit" disabled={pending} className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
        <Icon name="save" size={16} />
        {pending ? t.saving : t.save}
      </button>
    </form>
  );
}
