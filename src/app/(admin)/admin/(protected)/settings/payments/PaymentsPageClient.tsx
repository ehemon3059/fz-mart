"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { savePaymentsSettings } from "./actions";
import { buildCopy, type PaymentsCopy, type PaymentsLang } from "./content";

const inputCls =
  "w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-[14px] text-stone-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const labelCls = "mb-1 block text-[13px] font-semibold text-stone-700";

interface Config {
  onlineEnabled: boolean;
  partialEnabled: boolean;
  sslcommerz: { enabled: boolean; sandbox: boolean; storeId: string; feeBps: number; hasPassword: boolean };
  bkash: {
    enabled: boolean;
    sandbox: boolean;
    appKey: string;
    username: string;
    feeBps: number;
    hasSecret: boolean;
  };
  mock: { enabled: boolean };
}

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-2.5">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1" />
      <span>
        <span className="block text-[13.5px] font-semibold text-stone-700">{label}</span>
        {hint && <span className="block text-[12px] text-stone-400">{hint}</span>}
      </span>
    </label>
  );
}

export default function PaymentsPageClient({ config }: { config: Config }) {
  const [lang, setLang] = useState<PaymentsLang>("en");

  const siteUrlLink = (
    <a
      href="/admin/settings/appearance"
      className="font-semibold underline underline-offset-2 hover:text-amber-900"
    >
      Site URL
    </a>
  );

  const t = buildCopy(lang, siteUrlLink);
  const gi = t.gatewayIntro;

  // Loud go-live guard: warn whenever a checkout-facing method can't move real
  // money. An enabled gateway still in sandbox, or the mock test gateway being
  // on, both mean "not truly live" — surface it so the owner can't launch on
  // test credentials by accident.
  const sandboxActive =
    (config.sslcommerz.enabled && config.sslcommerz.sandbox) ||
    (config.bkash.enabled && config.bkash.sandbox) ||
    config.mock.enabled;

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-8 pb-28 sm:px-7 lg:pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
            {t.heading}
          </h1>
          <p className="mt-1 text-[13.5px] text-stone-500 sm:text-[14.5px]">
            {config.onlineEnabled ? t.statusOn : t.statusOff}
          </p>
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

      {sandboxActive && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3.5 text-red-800">
          <Icon name="warn" size={18} className="mt-0.5 shrink-0 text-red-500" />
          <div>
            <p className="text-[13.5px] font-extrabold uppercase tracking-wide">
              {t.sandboxWarning.title}
            </p>
            <p className="mt-0.5 text-[13px] leading-relaxed">{t.sandboxWarning.body}</p>
          </div>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
        {t.siteUrlWarning}
      </div>

      <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
        <h2 className="text-[15px] font-bold text-stone-800">{gi.heading}</h2>
        <p className="mt-1 text-[13px] text-stone-500">{gi.body}</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <GatewayCard card={gi.ssl} />
          <GatewayCard card={gi.bkash} />
        </div>
      </div>

      <div className="mt-6">
        {/* Secrets never reach the client — only whether one is stored. */}
        <PaymentsForm config={config} t={t.form} />
      </div>
    </div>
  );
}

function GatewayCard({ card }: { card: PaymentsCopy["gatewayIntro"]["ssl"] }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50/60 p-4">
      <h3 className="text-[14px] font-bold text-stone-800">{card.title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-stone-600">{card.body}</p>
      <p className="mt-3 text-[12.5px] font-semibold text-stone-700">{card.howTo}</p>
      <ol className="mt-1 list-decimal space-y-1 pl-4 text-[12.5px] leading-relaxed text-stone-600">
        {card.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  );
}

function PaymentsForm({ config, t }: { config: Config; t: PaymentsCopy["form"] }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await savePaymentsSettings(formData);
      if (result?.error) setError(result.error);
      else setSuccess(true);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
        <h2 className="text-[15px] font-bold text-stone-800">{t.onlineHeading}</h2>
        <div className="mt-4 space-y-3">
          <Toggle
            name="onlineEnabled"
            label={t.onlineToggle}
            hint={t.onlineHint}
            defaultChecked={config.onlineEnabled}
          />
          <Toggle
            name="partialEnabled"
            label={t.partialToggle}
            hint={t.partialHint}
            defaultChecked={config.partialEnabled}
          />
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
        <h2 className="text-[15px] font-bold text-stone-800">{t.sslHeading}</h2>
        <p className="mt-1 text-[13px] text-stone-400">{t.sslSubtitle}</p>
        <div className="mt-4 max-w-md space-y-4">
          <Toggle name="sslcommerzEnabled" label={t.sslEnable} defaultChecked={config.sslcommerz.enabled} />
          <Toggle
            name="sslcommerzSandbox"
            label={t.sandbox}
            hint={t.sslSandboxHint}
            defaultChecked={config.sslcommerz.sandbox}
          />
          <div>
            <label className={labelCls}>{t.storeId}</label>
            <input name="sslcommerzStoreId" defaultValue={config.sslcommerz.storeId} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t.storePassword}</label>
            <input
              name="sslcommerzStorePassword"
              type="password"
              placeholder={config.sslcommerz.hasPassword ? t.keepPlaceholder : t.storePasswordPlaceholder}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t.feePct}</label>
            <input
              name="sslcommerzFeePct"
              inputMode="decimal"
              defaultValue={config.sslcommerz.feeBps ? (config.sslcommerz.feeBps / 100).toString() : ""}
              placeholder="e.g. 2.5"
              className={inputCls}
            />
            <p className="mt-1 text-[12px] text-stone-400">{t.sslFeeHint}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
        <h2 className="text-[15px] font-bold text-stone-800">{t.bkashHeading}</h2>
        <p className="mt-1 text-[13px] text-stone-400">{t.bkashSubtitle}</p>
        <div className="mt-4 max-w-md space-y-4">
          <Toggle name="bkashEnabled" label={t.bkashEnable} defaultChecked={config.bkash.enabled} />
          <Toggle name="bkashSandbox" label={t.sandbox} defaultChecked={config.bkash.sandbox} />
          <div>
            <label className={labelCls}>{t.appKey}</label>
            <input name="bkashAppKey" defaultValue={config.bkash.appKey} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t.appSecret}</label>
            <input
              name="bkashAppSecret"
              type="password"
              placeholder={config.bkash.hasSecret ? t.keepPlaceholder : t.appSecretPlaceholder}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t.username}</label>
            <input name="bkashUsername" defaultValue={config.bkash.username} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t.password}</label>
            <input
              name="bkashPassword"
              type="password"
              placeholder={config.bkash.hasSecret ? t.keepPlaceholder : t.passwordPlaceholder}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t.feePct}</label>
            <input
              name="bkashFeePct"
              inputMode="decimal"
              defaultValue={config.bkash.feeBps ? (config.bkash.feeBps / 100).toString() : ""}
              placeholder="e.g. 1.85"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-5 sm:p-6">
        <Toggle
          name="mockEnabled"
          label={t.mockToggle}
          hint={t.mockHint}
          defaultChecked={config.mock.enabled}
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
        className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
      >
        <Icon name="save" size={16} />
        {pending ? t.saving : t.save}
      </button>
    </form>
  );
}
