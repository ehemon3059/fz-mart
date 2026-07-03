"use client";

import { useState, useTransition } from "react";
import { saveChatButtons } from "./actions";

const input = "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900";

export default function ChatSettingsForm({
  whatsappNumber,
  messengerUrl,
}: {
  whatsappNumber: string;
  messengerUrl: string;
}) {
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await saveChatButtons(formData);
      setSaved(true);
    });
  }

  return (
    <form action={handleSubmit} className="max-w-md space-y-4 rounded-xl border border-stone-200 bg-white p-5 shadow-soft">
      <div>
        <h2 className="text-[15px] font-bold text-stone-800">Floating chat buttons</h2>
        <p className="mt-1 text-[13px] text-stone-400">
          Shown bottom-right on the storefront. Leave blank to hide a button.
        </p>
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-semibold text-stone-700">WhatsApp number</label>
        <input name="whatsappNumber" defaultValue={whatsappNumber} placeholder="8801XXXXXXXXX" className={input} />
        <p className="mt-1 text-[12px] text-stone-400">Full international format, digits only (no + or spaces).</p>
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-semibold text-stone-700">Messenger link</label>
        <input name="messengerUrl" defaultValue={messengerUrl} placeholder="https://m.me/yourpage" className={input} />
      </div>
      {saved && <p className="text-[13px] font-medium text-brand-600">Saved.</p>}
      <button type="submit" disabled={pending} className="rounded-xl bg-brand-600 px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
        {pending ? "Saving…" : "Save chat buttons"}
      </button>
    </form>
  );
}
