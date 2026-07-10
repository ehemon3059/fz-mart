"use client";

import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import {
  savePathaoSettings,
  testPathaoSettings,
  saveRedxSettings,
  testRedxSettings,
  setCourierActiveProvider,
} from "./actions";

const inputClass =
  "w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-[14px] text-stone-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1 block text-[13px] font-semibold text-stone-700";

function WebhookHint({ path }: { path: string }) {
  return (
    <p className="mt-1.5 text-[12px] text-stone-400">
      Webhook URL:{" "}
      <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[11.5px] text-stone-600">
        {path}
      </code>
    </p>
  );
}

// ── Active provider selector ─────────────────────────────────────────────────

export function ActiveProviderSelector({
  active,
  configured,
}: {
  active: string | null;
  configured: { steadfast: boolean; pathao: boolean; redx: boolean };
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function choose(provider: string) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await setCourierActiveProvider(provider);
      if (res?.error) setError(res.error);
      else setSaved(true);
    });
  }

  const options: { value: string; label: string; ready: boolean }[] = [
    { value: "STEADFAST", label: "Steadfast", ready: configured.steadfast },
    { value: "PATHAO", label: "Pathao", ready: configured.pathao },
    { value: "REDX", label: "RedX", ready: configured.redx },
  ];

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
      <h2 className="text-[15px] font-bold text-stone-800">Active provider</h2>
      <p className="mt-1 text-[13px] text-stone-400">
        The default courier for <strong>new</strong> consignments. Already-shipped
        orders keep the provider they were created with — changing this never
        reroutes them.
      </p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {options.map((o) => {
          const isActive = active === o.value;
          return (
            <button
              key={o.value}
              type="button"
              disabled={pending || !o.ready}
              onClick={() => choose(o.value)}
              title={o.ready ? undefined : `Add ${o.label} credentials below and Save to enable`}
              className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-[13.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                isActive
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              {isActive && <Icon name="check" size={14} strokeWidth={2.6} />}
              {o.label}
              {!o.ready && <span className="text-[11px] font-normal text-stone-400">(not set)</span>}
            </button>
          );
        })}
      </div>
      {(!configured.pathao || !configured.redx) && (
        <p className="mt-3 text-[12px] text-stone-400">
          Providers marked <span className="font-medium">(not set)</span> are disabled
          until you fill in their credentials below and click Save.
        </p>
      )}
      {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
      {saved && <p className="mt-3 text-[13px] font-medium text-brand-600">Active provider updated.</p>}
    </div>
  );
}

// ── Shared form scaffolding ──────────────────────────────────────────────────

function useProviderForm(
  save: (fd: FormData) => Promise<{ error?: string; success?: boolean }>,
  test: (fd: FormData) => Promise<{ error?: string; success?: boolean }>,
) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [testOk, setTestOk] = useState(false);
  const [pending, startSave] = useTransition();
  const [testing, startTest] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    setTestOk(false);
    startSave(async () => {
      const res = await save(formData);
      if (res?.error) setError(res.error);
      else setSuccess(true);
    });
  }
  function handleTest() {
    if (!formRef.current) return;
    setError(null);
    setSuccess(false);
    setTestOk(false);
    const fd = new FormData(formRef.current);
    startTest(async () => {
      const res = await test(fd);
      if (res?.error) setError(res.error);
      else setTestOk(true);
    });
  }

  return {
    formRef,
    error,
    success,
    testOk,
    pending,
    testing,
    handleSubmit,
    handleTest,
  };
}

function FormButtons({
  testing,
  pending,
  onTest,
}: {
  testing: boolean;
  pending: boolean;
  onTest: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      <button
        type="button"
        onClick={onTest}
        disabled={testing || pending}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-[14px] font-semibold text-stone-700 shadow-soft hover:bg-stone-50 disabled:opacity-50"
      >
        <Icon name="globe" size={16} />
        {testing ? "Testing..." : "Test Connection"}
      </button>
      <button
        type="submit"
        disabled={pending || testing}
        className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
      >
        <Icon name="save" size={16} />
        {pending ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

function StatusLines({
  error,
  success,
  testOk,
}: {
  error: string | null;
  success: boolean;
  testOk: boolean;
}) {
  return (
    <>
      {error && <p className="text-[13px] text-red-600">{error}</p>}
      {testOk && (
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-brand-600">
          <Icon name="check" size={14} strokeWidth={2.6} /> Connection successful.
        </p>
      )}
      {success && (
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-brand-600">
          <Icon name="check" size={14} strokeWidth={2.6} /> Saved.
        </p>
      )}
    </>
  );
}

// ── Pathao form ──────────────────────────────────────────────────────────────

export function PathaoForm({
  config,
}: {
  config: {
    storeId: string;
    senderName: string;
    senderPhone: string;
    mode: "sandbox" | "live";
  } | null;
}) {
  const f = useProviderForm(savePathaoSettings, testPathaoSettings);
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
      <h2 className="text-[15px] font-bold text-stone-800">Pathao Courier</h2>
      <p className="mt-1 text-[13px] text-stone-400">
        OAuth2 client credentials. The access token is cached in Redis and
        refreshed automatically.
      </p>
      <form ref={f.formRef} action={f.handleSubmit} className="mt-4 max-w-md space-y-4">
        <div>
          <label className={labelClass}>Mode</label>
          <select name="mode" defaultValue={config?.mode ?? "sandbox"} className={inputClass}>
            <option value="sandbox">Sandbox</option>
            <option value="live">Live</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Client ID</label>
          <input
            name="clientId"
            type="password"
            autoComplete="off"
            placeholder={config ? "Leave blank to keep current" : "Pathao client id"}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Client Secret</label>
          <input
            name="clientSecret"
            type="password"
            autoComplete="off"
            placeholder={config ? "Leave blank to keep current" : "Pathao client secret"}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Store ID</label>
          <input name="storeId" defaultValue={config?.storeId} placeholder="Pathao store id" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Sender Name</label>
          <input name="senderName" defaultValue={config?.senderName} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Sender Phone</label>
          <input name="senderPhone" defaultValue={config?.senderPhone} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Webhook Secret</label>
          <input
            name="webhookSecret"
            type="password"
            autoComplete="off"
            placeholder={config ? "Leave blank to keep current" : "Shared webhook secret"}
            className={inputClass}
          />
          <WebhookHint path="/api/webhooks/courier/pathao" />
        </div>
        <StatusLines error={f.error} success={f.success} testOk={f.testOk} />
        <FormButtons testing={f.testing} pending={f.pending} onTest={f.handleTest} />
      </form>
    </div>
  );
}

// ── RedX form ────────────────────────────────────────────────────────────────

export function RedxForm({
  config,
}: {
  config: { pickupStoreId: string; senderName: string; senderPhone: string } | null;
}) {
  const f = useProviderForm(saveRedxSettings, testRedxSettings);
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
      <h2 className="text-[15px] font-bold text-stone-800">RedX Courier</h2>
      <p className="mt-1 text-[13px] text-stone-400">
        Static Bearer API key — sandbox vs live is decided by which key you paste.
      </p>
      <form ref={f.formRef} action={f.handleSubmit} className="mt-4 max-w-md space-y-4">
        <div>
          <label className={labelClass}>API Key</label>
          <input
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder={config ? "Leave blank to keep current" : "RedX API access token"}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Pickup Store ID</label>
          <input name="pickupStoreId" defaultValue={config?.pickupStoreId} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Sender Name</label>
          <input name="senderName" defaultValue={config?.senderName} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Sender Phone</label>
          <input name="senderPhone" defaultValue={config?.senderPhone} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Webhook Secret</label>
          <input
            name="webhookSecret"
            type="password"
            autoComplete="off"
            placeholder={config ? "Leave blank to keep current" : "Shared webhook secret"}
            className={inputClass}
          />
          <WebhookHint path="/api/webhooks/courier/redx" />
        </div>
        <StatusLines error={f.error} success={f.success} testOk={f.testOk} />
        <FormButtons testing={f.testing} pending={f.pending} onTest={f.handleTest} />
      </form>
    </div>
  );
}
