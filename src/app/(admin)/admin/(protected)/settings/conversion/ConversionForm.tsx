"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { saveConversionSettings } from "./actions";

interface Props {
  config: {
    otpEnabled: boolean;
    returnWindowDays: number;
    abandonedCartEnabled: boolean;
    abandonedCartDelayHours: number;
    abandonedCartMessage: string;
  };
}

const input = "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900";

export default function ConversionForm({ config }: Props) {
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
        <h2 className="text-[15px] font-bold text-stone-800">Phone OTP at COD checkout</h2>
        <label className="mt-3 flex items-start gap-2.5">
          <input type="checkbox" name="otpEnabled" defaultChecked={config.otpEnabled} className="mt-1" />
          <span>
            <span className="block text-[13.5px] font-semibold text-stone-700">Require phone verification for COD</span>
            <span className="block text-[12px] text-stone-400">
              New customers get an SMS code before a Cash-on-Delivery order is placed. Repeat
              (delivered) buyers skip it. Requires a configured SMS gateway.
            </span>
          </span>
        </label>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-[15px] font-bold text-stone-800">Returns</h2>
        <label className="mb-1 mt-3 block text-[13px] font-semibold text-stone-700">Return window (days)</label>
        <input
          name="returnWindowDays"
          inputMode="numeric"
          defaultValue={config.returnWindowDays}
          className={`${input} w-32`}
        />
        <p className="mt-1 text-[12px] text-stone-400">
          Customers can request a return within this many days of delivery.
        </p>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-[15px] font-bold text-stone-800">Abandoned-cart recovery</h2>
        <label className="mt-3 flex items-start gap-2.5">
          <input type="checkbox" name="abandonedCartEnabled" defaultChecked={config.abandonedCartEnabled} className="mt-1" />
          <span>
            <span className="block text-[13.5px] font-semibold text-stone-700">Send recovery reminders</span>
            <span className="block text-[12px] text-stone-400">
              For signed-in customers who reach checkout but don&apos;t finish.
            </span>
          </span>
        </label>
        <div className="mt-4">
          <label className="mb-1 block text-[13px] font-semibold text-stone-700">Delay before reminder (hours)</label>
          <input name="abandonedCartDelayHours" inputMode="numeric" defaultValue={config.abandonedCartDelayHours} className={`${input} w-32`} />
        </div>
        <div className="mt-4">
          <label className="mb-1 block text-[13px] font-semibold text-stone-700">Reminder message (SMS)</label>
          <textarea name="abandonedCartMessage" rows={2} defaultValue={config.abandonedCartMessage} className={input} />
          <p className="mt-1 text-[12px] text-stone-400">
            Use <code className="rounded bg-stone-100 px-1">{"{link}"}</code> for the restore-cart link.
          </p>
        </div>
      </section>

      {error && <p className="text-[13px] text-red-600">{error}</p>}
      {success && (
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
