"use client";

import { useState, useTransition } from "react";
import { saveInventorySettings, sendDigestNow } from "./actions";

export default function InventoryForm({ digestEnabled }: { digestEnabled: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const res = await saveInventorySettings(formData);
      setMsg(res.success ?? res.error ?? null);
    });
  }

  function testNow() {
    setMsg(null);
    startTransition(async () => {
      const res = await sendDigestNow();
      setMsg(res.success ?? res.error ?? null);
    });
  }

  return (
    <form action={save} className="max-w-md space-y-4 rounded-xl border border-stone-200 bg-white p-5 shadow-soft">
      <label className="flex items-start gap-2.5">
        <input type="checkbox" name="digestEnabled" defaultChecked={digestEnabled} className="mt-1" />
        <span>
          <span className="block text-[13.5px] font-semibold text-stone-700">Daily low-stock email digest</span>
          <span className="block text-[12px] text-stone-400">
            Emails owners &amp; managers each morning (08:00) with products at or below their low-stock threshold.
            Requires SMTP configured and the worker running.
          </span>
        </span>
      </label>

      {msg && <p className="text-[13px] text-brand-600">{msg}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-xl bg-brand-600 px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={testNow} disabled={pending} className="rounded-xl border border-stone-300 px-4 py-2.5 text-[14px] font-semibold text-stone-700 disabled:opacity-50">
          Send now
        </button>
      </div>
    </form>
  );
}
