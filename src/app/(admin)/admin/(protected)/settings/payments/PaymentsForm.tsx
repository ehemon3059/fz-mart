"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { savePaymentsSettings } from "./actions";

interface Props {
  config: {
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
  };
}

const inputCls =
  "w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-[14px] text-stone-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const labelCls = "mb-1 block text-[13px] font-semibold text-stone-700";

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

export default function PaymentsForm({ config }: Props) {
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
        <h2 className="text-[15px] font-bold text-stone-800">Online payments</h2>
        <div className="mt-4 space-y-3">
          <Toggle
            name="onlineEnabled"
            label="Enable online payment at checkout"
            hint="When off, customers only see Cash on Delivery — regardless of provider settings below."
            defaultChecked={config.onlineEnabled}
          />
          <Toggle
            name="partialEnabled"
            label="Allow partial advance (pay delivery charge online, rest COD)"
            hint="The standard BD anti-fake-order option: the customer commits the delivery fee up front."
            defaultChecked={config.partialEnabled}
          />
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
        <h2 className="text-[15px] font-bold text-stone-800">SSLCommerz</h2>
        <p className="mt-1 text-[13px] text-stone-400">
          Hosted checkout — one integration covers cards, bKash, Nagad, Rocket and bank wallets.
        </p>
        <div className="mt-4 max-w-md space-y-4">
          <Toggle name="sslcommerzEnabled" label="Enable SSLCommerz" defaultChecked={config.sslcommerz.enabled} />
          <Toggle
            name="sslcommerzSandbox"
            label="Sandbox mode"
            hint="Use the SSLCommerz sandbox until your store account goes live."
            defaultChecked={config.sslcommerz.sandbox}
          />
          <div>
            <label className={labelCls}>Store ID</label>
            <input name="sslcommerzStoreId" defaultValue={config.sslcommerz.storeId} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Store Password</label>
            <input
              name="sslcommerzStorePassword"
              type="password"
              placeholder={config.sslcommerz.hasPassword ? "Leave blank to keep current" : "Store password"}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Gateway fee (%)</label>
            <input
              name="sslcommerzFeePct"
              inputMode="decimal"
              defaultValue={config.sslcommerz.feeBps ? (config.sslcommerz.feeBps / 100).toString() : ""}
              placeholder="e.g. 2.5"
              className={inputCls}
            />
            <p className="mt-1 text-[12px] text-stone-400">
              Recorded automatically as this order&apos;s gateway cost in the P&amp;L when a payment succeeds.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
        <h2 className="text-[15px] font-bold text-stone-800">bKash (PGW)</h2>
        <p className="mt-1 text-[13px] text-stone-400">
          Direct bKash tokenized checkout — customers pay inside the bKash flow.
        </p>
        <div className="mt-4 max-w-md space-y-4">
          <Toggle name="bkashEnabled" label="Enable bKash" defaultChecked={config.bkash.enabled} />
          <Toggle
            name="bkashSandbox"
            label="Sandbox mode"
            defaultChecked={config.bkash.sandbox}
          />
          <div>
            <label className={labelCls}>App Key</label>
            <input name="bkashAppKey" defaultValue={config.bkash.appKey} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>App Secret</label>
            <input
              name="bkashAppSecret"
              type="password"
              placeholder={config.bkash.hasSecret ? "Leave blank to keep current" : "App secret"}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Username</label>
            <input name="bkashUsername" defaultValue={config.bkash.username} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Password</label>
            <input
              name="bkashPassword"
              type="password"
              placeholder={config.bkash.hasSecret ? "Leave blank to keep current" : "Password"}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Gateway fee (%)</label>
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
          label="Enable test gateway (mock provider)"
          hint="Development and automated tests only — shows a fake 'Pay' page. Never enable on a live store."
          defaultChecked={config.mock.enabled}
        />
      </div>

      {error && <p className="text-[13px] text-red-600">{error}</p>}
      {success && (
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-brand-600">
          <Icon name="check" size={14} strokeWidth={2.6} /> Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
      >
        <Icon name="save" size={16} />
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
