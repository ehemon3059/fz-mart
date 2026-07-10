"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { saveGoogleOAuthSettings } from "./actions";
import { buildCopy, type OAuthLang } from "./content";

interface Props {
  config: {
    clientId: string;
    redirectUri: string;
  } | null;
  /** Suggested redirect URI for first-time setup, derived from the request host. */
  defaultRedirectUri: string;
}

const inputCls =
  "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[14.5px] text-stone-900 placeholder:text-stone-400 shadow-soft focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

export default function GoogleOAuthPageClient({ config, defaultRedirectUri }: Props) {
  const [lang, setLang] = useState<OAuthLang>("en");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const redirectUri = config?.redirectUri || defaultRedirectUri;
  const origin = redirectUri.replace(/\/login\/google\/callback$/, "");

  // Copy button label follows the current language.
  function CopyField({ value }: { value: string }) {
    const [copied, setCopied] = useState(false);
    return (
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
        <code className="block break-all px-3 py-2 font-mono text-[12px] leading-relaxed text-stone-700">
          {value}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex w-full items-center justify-center gap-1.5 border-t border-stone-200 bg-white py-1.5 text-[12px] font-semibold text-stone-600 hover:bg-stone-50"
        >
          {copied ? (
            <>
              <Icon name="check" size={13} strokeWidth={2.6} /> {t.form.copied}
            </>
          ) : (
            t.form.copy
          )}
        </button>
      </div>
    );
  }

  const t = buildCopy(lang, { origin, redirectUri, CopyField });

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await saveGoogleOAuthSettings(formData);
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

      {/* What / Why / Benefit */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {t.cards.map((card, i) => (
          <div key={i} className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon name={(["info", "warn", "shield"] as const)[i]} size={18} />
            </div>
            <h3 className="mt-3 text-[14.5px] font-bold text-stone-800">{card.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-stone-500">{card.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Form */}
        <form action={handleSubmit} className="space-y-6">
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-bold text-stone-900">{t.form.credsHeading}</h2>
                <p className="mt-0.5 text-[13px] text-stone-500">{t.form.credsSubtitle}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                  config ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${config ? "bg-emerald-500" : "bg-amber-500"}`} />
                {config ? t.form.configured : t.form.notConfigured}
              </span>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                  {t.form.clientIdLabel}
                </label>
                <input
                  name="clientId"
                  required
                  defaultValue={config?.clientId}
                  placeholder={t.form.clientIdPlaceholder}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                  {t.form.clientSecretLabel}
                </label>
                <input
                  name="clientSecret"
                  type="password"
                  placeholder={config ? t.form.clientSecretKeepPlaceholder : t.form.clientSecretPlaceholder}
                  className={inputCls}
                />
                {config && <p className="mt-1.5 text-[12px] text-stone-400">{t.form.clientSecretHelp}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                  {t.form.redirectLabel}
                </label>
                <input name="redirectUri" required defaultValue={redirectUri} className={inputCls} />
                <p className="mt-1.5 text-[12px] text-stone-400">
                  {t.form.redirectHelpPrefix}{" "}
                  <code className="rounded bg-stone-100 px-1 py-0.5">/login/google/callback</code>
                  {t.form.redirectHelpSuffix}
                </p>
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

        {/* Setup guide */}
        <aside className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6 lg:self-start">
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
            <p>
              {t.guide.warningPrefix} <code>http</code> vs <code>https</code>, port, and trailing slash all
              matter, or login fails with <code>redirect_uri_mismatch</code>.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
