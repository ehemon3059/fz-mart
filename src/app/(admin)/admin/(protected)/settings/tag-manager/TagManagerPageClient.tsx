"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { saveGtmId } from "./actions";
import { buildCopy, type TagManagerLang } from "./content";

const inputCls =
  "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[14.5px] font-mono text-stone-900 placeholder:text-stone-400 shadow-soft focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

export default function TagManagerPageClient({ initialGtmId }: { initialGtmId: string | null }) {
  const [lang, setLang] = useState<TagManagerLang>("en");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const t = buildCopy(lang);
  const configured = Boolean(initialGtmId);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await saveGtmId(formData);
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
                <h2 className="text-[15px] font-bold text-stone-900">{t.form.containerHeading}</h2>
                <p className="mt-0.5 text-[13px] text-stone-500">{t.form.containerSubtitle}</p>
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
                {t.form.gtmIdLabel}
              </label>
              <input
                name="gtmId"
                defaultValue={initialGtmId ?? ""}
                placeholder="GTM-XXXXXXX"
                className={inputCls}
              />
              <p className="mt-1.5 text-[12px] text-stone-400">{t.form.gtmIdHelp}</p>
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
          {/* What is it */}
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon name="tag" size={18} />
              </span>
              <h2 className="text-[15px] font-bold text-stone-900">{t.whatIs.heading}</h2>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-stone-500">{t.whatIs.body1}</p>
            <p className="mt-3 text-[13px] leading-relaxed text-stone-500">{t.whatIs.body2}</p>
          </div>

          {/* How to set up */}
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon name="info" size={18} />
              </span>
              <div>
                <h2 className="text-[15px] font-bold text-stone-900">{t.guide.heading}</h2>
                <p className="text-[12.5px] text-stone-500">{t.guide.subtitle}</p>
              </div>
            </div>

            <ol className="mt-5 space-y-0">
              {t.guide.steps.map((step, i, arr) => (
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
              <p>{t.guide.warning}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
