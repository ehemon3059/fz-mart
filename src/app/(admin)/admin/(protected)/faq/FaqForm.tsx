"use client";

import { useState, useTransition } from "react";
import { saveFaq } from "./actions";

interface Props {
  faq?: {
    id: number;
    question: string;
    answer: string;
    sortOrder: number;
    isActive: boolean;
  };
}

export default function FaqForm({ faq }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await saveFaq(faq?.id ?? null, formData);
      if (result?.error) setError(result.error);
    });
  }

  const inputCls =
    "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[14.5px] text-stone-900 placeholder:text-stone-400 shadow-soft focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-6">
        <h2 className="text-[15px] font-bold text-stone-900">Question &amp; answer</h2>
        <p className="mt-0.5 text-[13px] text-stone-500">
          Shown to customers in the storefront help center.
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Question</label>
            <input
              name="question"
              required
              defaultValue={faq?.question}
              placeholder="e.g. How long does delivery take?"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Answer</label>
            <textarea
              name="answer"
              required
              rows={5}
              defaultValue={faq?.answer}
              placeholder="Write a clear, helpful answer…"
              className={`${inputCls} resize-y`}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-6">
        <h2 className="text-[15px] font-bold text-stone-900">Display</h2>
        <p className="mt-0.5 text-[13px] text-stone-500">Ordering and visibility.</p>

        <div className="mt-5 space-y-5">
          <div className="max-w-[200px]">
            <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Sort order</label>
            <input
              name="sortOrder"
              type="number"
              defaultValue={faq?.sortOrder ?? 0}
              className={inputCls}
            />
            <p className="mt-1.5 text-[12px] text-stone-400">Lower numbers appear first.</p>
          </div>

          <label className="flex w-fit cursor-pointer items-center gap-2.5 text-[14px] font-medium text-stone-700">
            <input
              name="isActive"
              type="checkbox"
              defaultChecked={faq?.isActive ?? true}
              className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500/30"
            />
            Active (visible to customers)
          </label>
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
        {pending ? "Saving…" : "Save FAQ"}
      </button>
    </form>
  );
}
