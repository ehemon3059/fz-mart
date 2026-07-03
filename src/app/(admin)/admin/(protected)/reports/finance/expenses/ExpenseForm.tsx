"use client";

import { useState, useTransition } from "react";
import type { ExpenseCategory } from "@prisma/client";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "@/config/expense-category";
import { saveExpense } from "./actions";

interface Props {
  expense?: {
    id: number;
    category: ExpenseCategory;
    description: string;
    amount: number; // paisa
    incurredOn: Date;
  };
}

export default function ExpenseForm({ expense }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await saveExpense(expense?.id ?? null, formData);
      if (result?.error) setError(result.error);
    });
  }

  const inputCls =
    "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[14.5px] text-stone-900 placeholder:text-stone-400 shadow-soft focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

  // <input type="date"> wants YYYY-MM-DD; default to today for a new entry.
  const dateValue = (expense?.incurredOn ?? new Date()).toISOString().slice(0, 10);

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-6">
        <h2 className="text-[15px] font-bold text-stone-900">Expense details</h2>
        <p className="mt-0.5 text-[13px] text-stone-500">
          Recorded against the month you set below, so back-dating a bill is fine.
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Category</label>
            <select name="category" defaultValue={expense?.category ?? "MARKETING"} className={inputCls}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {EXPENSE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Description</label>
            <input
              name="description"
              required
              defaultValue={expense?.description}
              placeholder="e.g. Facebook ad campaign — July"
              className={inputCls}
            />
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
                defaultValue={expense ? expense.amount / 100 : ""}
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Date incurred</label>
              <input name="incurredOn" type="date" required defaultValue={dateValue} className={inputCls} />
            </div>
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
        {pending ? "Saving…" : "Save expense"}
      </button>
    </form>
  );
}
