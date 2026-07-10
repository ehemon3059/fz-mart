"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { saveSmtpSettings } from "./actions";
import { buildCopy, type SmtpLang } from "./content";

interface Props {
  config: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    fromAddress: string;
    fromName: string;
  } | null;
}

const inputCls =
  "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[14.5px] text-stone-900 placeholder:text-stone-400 shadow-soft focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";
const labelCls = "mb-1.5 block text-[13px] font-semibold text-stone-700";

export default function SmtpPageClient({ config }: Props) {
  const [lang, setLang] = useState<SmtpLang>("en");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const t = buildCopy(lang);
  const configured = Boolean(config?.host);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await saveSmtpSettings(formData);
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
          {/* Server card */}
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-bold text-stone-900">{t.form.serverHeading}</h2>
                <p className="mt-0.5 text-[13px] text-stone-500">{t.form.serverSubtitle}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                  configured ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${configured ? "bg-emerald-500" : "bg-amber-500"}`}
                />
                {configured ? t.form.configured : t.form.notConfigured}
              </span>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <label className={labelCls}>{t.form.hostLabel}</label>
                <input name="host" required defaultValue={config?.host} placeholder="smtp.gmail.com" className={inputCls} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>{t.form.portLabel}</label>
                  <input name="port" type="number" required defaultValue={config?.port ?? 587} className={inputCls} />
                </div>
                <label className="flex cursor-pointer items-center gap-2.5 self-center pt-6 text-[14px] font-medium text-stone-700">
                  <input
                    name="secure"
                    type="checkbox"
                    defaultChecked={config?.secure ?? false}
                    className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500/30"
                  />
                  {t.form.tlsLabel}
                </label>
              </div>

              <div>
                <label className={labelCls}>{t.form.usernameLabel}</label>
                <input name="user" defaultValue={config?.user} placeholder="you@gmail.com" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t.form.passwordLabel}</label>
                <input
                  name="password"
                  type="password"
                  placeholder={config ? t.form.passwordKeepPlaceholder : t.form.passwordPlaceholder}
                  className={inputCls}
                />
                {configured && <p className="mt-1.5 text-[12px] text-stone-400">{t.form.passwordHelp}</p>}
              </div>
            </div>
          </div>

          {/* Sender card */}
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-6">
            <h2 className="text-[15px] font-bold text-stone-900">{t.form.senderHeading}</h2>
            <p className="mt-0.5 text-[13px] text-stone-500">{t.form.senderSubtitle}</p>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelCls}>{t.form.fromAddressLabel}</label>
                <input
                  name="fromAddress"
                  required
                  type="email"
                  defaultValue={config?.fromAddress}
                  placeholder="orders@fz-mart.example"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t.form.fromNameLabel}</label>
                <input name="fromName" defaultValue={config?.fromName ?? "fz-mart"} className={inputCls} />
              </div>
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

        {/* Info column */}
        <aside className="space-y-4 lg:self-start">
          {/* What is SMTP */}
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon name="info" size={18} />
              </span>
              <h2 className="text-[15px] font-bold text-stone-900">{t.whatIs.heading}</h2>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-stone-500">{t.whatIs.body}</p>
            <div className="mt-3 flex gap-2.5 rounded-lg border border-stone-200 bg-stone-50 p-3 text-[12.5px] leading-relaxed text-stone-600">
              <Icon name="warn" size={16} className="mt-px shrink-0 text-stone-400" />
              <p>{t.whatIs.note}</p>
            </div>
          </div>

          {/* Gmail */}
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon name="externalLink" size={17} />
              </span>
              <div>
                <h2 className="text-[15px] font-bold text-stone-900">{t.gmail.heading}</h2>
                <p className="text-[12.5px] text-stone-500">{t.gmail.subtitle}</p>
              </div>
            </div>

            <ol className="mt-5 space-y-0">
              {t.gmail.steps.map((step, i, arr) => (
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
              <p>{t.gmail.warning}</p>
            </div>
          </div>

          {/* Own domain */}
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon name="settings" size={17} />
              </span>
              <div>
                <h2 className="text-[15px] font-bold text-stone-900">{t.domain.heading}</h2>
                <p className="text-[12.5px] text-stone-500">{t.domain.subtitle}</p>
              </div>
            </div>

            <p className="mt-3 text-[13px] leading-relaxed text-stone-500">{t.domain.intro}</p>

            <div className="mt-3 space-y-2.5">
              <div className="rounded-lg border border-stone-200 p-3">
                <p className="text-[13px] font-semibold text-stone-800">{t.domain.cpanelTitle}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-stone-500">{t.domain.cpanelBody}</p>
              </div>
              <div className="rounded-lg border border-stone-200 p-3">
                <p className="text-[13px] font-semibold text-stone-800">{t.domain.serviceTitle}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-stone-500">{t.domain.serviceBody}</p>
              </div>
            </div>

            <div className="mt-3 flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12.5px] leading-relaxed text-amber-800">
              <Icon name="warn" size={16} className="mt-px shrink-0 text-amber-500" />
              <p>{t.domain.warning}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
