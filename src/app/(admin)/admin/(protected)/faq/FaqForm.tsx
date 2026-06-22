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

  return (
    <form action={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1">Question</label>
        <input
          name="question"
          required
          defaultValue={faq?.question}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Answer</label>
        <textarea
          name="answer"
          required
          rows={5}
          defaultValue={faq?.answer}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Sort Order</label>
        <input
          name="sortOrder"
          type="number"
          defaultValue={faq?.sortOrder ?? 0}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input name="isActive" type="checkbox" defaultChecked={faq?.isActive ?? true} />
        Active
      </label>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-black text-white px-4 py-2 rounded font-medium disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
