"use client";

import { useState, useTransition } from "react";
import type { AdChannel } from "@prisma/client";
import { AD_CHANNELS, AD_CHANNEL_LABELS } from "@/config/ad-channel";
import { saveAdSpend } from "./actions";

interface Props {
  adSpend?: {
    id: number;
    channel: AdChannel;
    amount: number; // paisa
    spentOn: Date;
    note: string | null;
  };
}

export default function AdSpendForm({ adSpend }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await saveAdSpend(adSpend?.id ?? null, formData);
      if (result?.error) setError(result.error);
    });
  }

  const inputCls =
    "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[14.5px] text-stone-900 placeholder:text-stone-400 shadow-soft focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

  // <input type="date"> wants YYYY-MM-DD; default to today for a new entry.
  const dateValue = (adSpend?.spentOn ?? new Date()).toISOString().slice(0, 10);

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-6">
        <h2 className="text-[15px] font-bold text-stone-900">Ad spend</h2>
        <p className="mt-0.5 text-[13px] text-stone-500">
          Recorded against the month you set below. The finance dashboard divides this by the
          revenue from delivered orders attributed to this channel to show ROAS and CAC.
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Channel</label>
            <select name="channel" defaultValue={adSpend?.channel ?? "FACEBOOK"} className={inputCls}>
              {AD_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {AD_CHANNEL_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Amount (৳)</label>
              <input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={adSpend ? adSpend.amount / 100 : ""}
                placeholder="e.g. 30000"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Date spent</label>
              <input name="spentOn" type="date" required defaultValue={dateValue} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">
              Note <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <input
              name="note"
              defaultValue={adSpend?.note ?? ""}
              placeholder="e.g. July retargeting campaign"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-brand-600 px-5 py-2.5 text-[14.5px] font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save ad spend"}
      </button>
    </form>
  );
}
