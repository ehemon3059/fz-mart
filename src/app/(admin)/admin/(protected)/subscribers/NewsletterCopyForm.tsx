"use client";

import { useState, useTransition } from "react";
import { saveNewsletterCopyAction } from "./actions";

const inputCls =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-900";
const labelCls = "mb-1 block text-[13px] font-semibold text-stone-700";

export default function NewsletterCopyForm({
  initialTitle,
  initialSubtitle,
}: {
  initialTitle: string;
  initialSubtitle: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await saveNewsletterCopyAction(formData);
      if (res?.error) setError(res.error);
      else setSaved(true);
    });
  }

  return (
    <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="text-[15px] font-bold text-stone-900">Signup box text</h2>
      <p className="mt-0.5 text-[13px] text-stone-500">
        Edit the title and subtitle shown on the storefront “Get ৳150 off” signup box. Changes go
        live immediately after saving.
      </p>

      <form action={handleSubmit} className="mt-4 max-w-xl space-y-4">
        <div>
          <label className={labelCls}>Title</label>
          <input
            name="title"
            defaultValue={initialTitle}
            maxLength={120}
            placeholder="Get ৳150 off your first order"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Subtitle</label>
          <textarea
            name="subtitle"
            defaultValue={initialSubtitle}
            maxLength={200}
            rows={2}
            placeholder="Subscribe for exclusive deals, new arrivals and early access to flash sales."
            className={`${inputCls} resize-y`}
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </p>
        )}
        {saved && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
            Saved — the storefront signup box is updated.
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-stone-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save text"}
        </button>
      </form>
    </div>
  );
}
