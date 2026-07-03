"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { saveSmsSettings } from "./actions";

interface Props {
  config: { apiUrl: string; senderId: string } | null;
}

export default function SmsForm({ config }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await saveSmsSettings(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
      <h2 className="text-[15px] font-bold text-stone-800">Provider credentials</h2>
      <p className="mt-1 text-[13px] text-stone-400">
        These keys are used by the order queue to send SMS — only fill in once your provider account is ready.
      </p>

      <form action={handleSubmit} className="mt-4 max-w-md space-y-4">
        <div>
          <label className="mb-1 block text-[13px] font-semibold text-stone-700">Provider API URL</label>
          <input
            name="apiUrl"
            defaultValue={config?.apiUrl}
            placeholder="https://api.smsprovider.com/send"
            className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-[14px] text-stone-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <p className="mt-1 text-[12px] text-stone-400">Leave blank to stub-log sends instead of sending.</p>
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-semibold text-stone-700">API Key</label>
          <input
            name="apiKey"
            type="password"
            placeholder={config ? "Leave blank to keep current key" : "Your provider API key"}
            className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-[14px] text-stone-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-semibold text-stone-700">Sender ID</label>
          <input
            name="senderId"
            defaultValue={config?.senderId}
            placeholder="fz-mart"
            className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-[14px] text-stone-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
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
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-600 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 sm:w-auto sm:px-5"
        >
          <Icon name="save" size={16} />
          {pending ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
