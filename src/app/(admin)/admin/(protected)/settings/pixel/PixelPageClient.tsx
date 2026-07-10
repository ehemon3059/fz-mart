"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { savePixelId } from "./actions";
import { buildCopy, type PixelLang } from "./content";

const inputCls =
  "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[14.5px] font-mono text-stone-900 placeholder:text-stone-400 shadow-soft focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

export default function PixelPageClient({
  initialPixelId,
  hasAccessToken,
  initialTestEventCode,
}: {
  initialPixelId: string | null;
  hasAccessToken: boolean;
  initialTestEventCode: string;
}) {
  const [lang, setLang] = useState<PixelLang>("en");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const t = buildCopy(lang);
  const configured = Boolean(initialPixelId);
  // Server-side confirmation events also need the access token; "fully active"
  // means both are set.
  const capiActive = configured && hasAccessToken;

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await savePixelId(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-6 pb-12 sm:px-7 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-stone-900">{t.heading}</h1>
          <p className="mt-1 max-w-xl text-[14.5px] text-stone-500">{t.intro}</p>
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

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Form */}
        <form action={handleSubmit} className="space-y-6">
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-bold text-stone-900">{t.form.pixelHeading}</h2>
                <p className="mt-0.5 text-[13px] text-stone-500">{t.form.pixelSubtitle}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                  configured ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${configured ? "bg-emerald-500" : "bg-stone-400"}`}
                />
                {configured ? t.form.active : t.form.disabled}
              </span>
            </div>

            <div className="mt-5">
              <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                {t.form.pixelIdLabel}
              </label>
              <input
                name="pixelId"
                defaultValue={initialPixelId ?? ""}
                placeholder="1234567890123456"
                className={inputCls}
              />
              <p className="mt-1.5 text-[12px] text-stone-400">{t.form.pixelIdHelp}</p>
            </div>
          </div>

          {/* Conversions API — confirmed-order tracking */}
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-bold text-stone-900">{t.form.capiHeading}</h2>
                <p className="mt-0.5 text-[13px] text-stone-500">{t.form.capiSubtitle}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                  capiActive ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${capiActive ? "bg-emerald-500" : "bg-stone-400"}`}
                />
                {capiActive ? t.form.activeCapi : t.form.off}
              </span>
            </div>

            <div className="mt-5">
              <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                {t.form.tokenLabel}
              </label>
              <input
                name="capiAccessToken"
                type="password"
                autoComplete="off"
                placeholder={hasAccessToken ? t.form.tokenSavedPlaceholder : t.form.tokenPlaceholder}
                className={inputCls}
              />
              <p className="mt-1.5 text-[12px] text-stone-400">
                {t.form.tokenHelp}
                {hasAccessToken && t.form.tokenHelpKeep}
              </p>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                {t.form.testCodeLabel}
              </label>
              <input
                name="capiTestEventCode"
                defaultValue={initialTestEventCode}
                placeholder="TEST12345"
                className={inputCls}
              />
              <p className="mt-1.5 text-[12px] text-stone-400">{t.form.testCodeHelp}</p>
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-600">
              {error}
            </p>
          )}
          {success && (
            <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13.5px] font-medium text-emerald-700">
              <Icon name="check" size={16} strokeWidth={2.4} /> {t.form.saved}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-[14.5px] font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
          >
            {pending ? t.form.saving : t.form.save}
          </button>
        </form>

        {/* Info + setup guide */}
        <aside className="space-y-4 lg:self-start">
          {/* Why this feature — the fake-order problem it solves */}
          <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-5 shadow-soft sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                <Icon name="info" size={18} />
              </span>
              <h2 className="text-[15px] font-bold text-stone-900">{t.why.heading}</h2>
            </div>

            <div className="mt-4 space-y-4 text-[13px] leading-relaxed text-stone-600">
              <div>
                <p className="font-semibold text-stone-800">{t.why.problemTitle}</p>
                <p className="mt-1">{t.why.problemBody}</p>
              </div>
              <div>
                <p className="font-semibold text-stone-800">{t.why.fixTitle}</p>
                <p className="mt-1">{t.why.fixBody}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[13px] font-semibold text-stone-800">{t.why.getTitle}</p>
              <ul className="mt-1.5 space-y-1.5">
                {t.why.getItems.map((b) => (
                  <li key={b} className="flex gap-2 text-[13px] leading-relaxed text-stone-600">
                    <Icon name="check" size={15} strokeWidth={2.4} className="mt-0.5 shrink-0 text-brand-500" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* How confirmed-order tracking works */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-soft sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <Icon name="check" size={18} strokeWidth={2.4} />
              </span>
              <h2 className="text-[15px] font-bold text-stone-900">{t.how.heading}</h2>
            </div>
            <ol className="mt-4 space-y-2.5 text-[13px] leading-relaxed text-stone-600">
              {t.how.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
            <div className="mt-3 flex gap-2.5 rounded-lg border border-emerald-200 bg-white/70 p-3 text-[12.5px] leading-relaxed text-emerald-800">
              <Icon name="info" size={16} className="mt-px shrink-0 text-emerald-500" />
              <p>{t.how.note}</p>
            </div>
          </div>

          {/* What / why / benefits */}
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon name="info" size={18} />
              </span>
              <h2 className="text-[15px] font-bold text-stone-900">{t.about.heading}</h2>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[13px] font-semibold text-stone-800">{t.about.whatTitle}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-stone-500">{t.about.whatBody}</p>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-stone-800">{t.about.whyTitle}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-stone-500">{t.about.whyBody}</p>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-stone-800">{t.about.benefitsTitle}</p>
                <ul className="mt-1.5 space-y-1.5">
                  {t.about.benefits.map((b) => (
                    <li key={b} className="flex gap-2 text-[13px] leading-relaxed text-stone-500">
                      <Icon name="check" size={15} strokeWidth={2.4} className="mt-0.5 shrink-0 text-brand-500" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Where to find it */}
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon name="search" size={18} />
              </span>
              <div>
                <h2 className="text-[15px] font-bold text-stone-900">{t.where.heading}</h2>
                <p className="text-[12.5px] text-stone-500">{t.where.subtitle}</p>
              </div>
            </div>

            <ol className="mt-5 space-y-0">
              {t.where.steps.map((step, i, arr) => (
                <li key={i} className="flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[12px] font-bold text-white">
                      {i + 1}
                    </span>
                    {i < arr.length - 1 && <span className="w-px flex-1 bg-stone-200" />}
                  </div>
                  <div className={i < arr.length - 1 ? "pb-5" : ""}>
                    <p className="text-[13.5px] font-semibold text-stone-800">{step.title}</p>
                    <div className="mt-1 text-[13px] leading-relaxed text-stone-500">{step.body}</div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-2 flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12.5px] leading-relaxed text-amber-800">
              <Icon name="warn" size={16} className="mt-px shrink-0 text-amber-500" />
              <p>{t.where.warning}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
