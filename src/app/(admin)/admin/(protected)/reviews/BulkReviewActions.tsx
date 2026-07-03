"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  bulkApproveReviewsAction,
  bulkHideReviewsAction,
  bulkDeleteReviewsAction,
} from "./actions";

// Wraps the server-rendered reviews table in a <form>. Selection lives in the
// DOM (checkboxes named "reviewId"), so the table stays a Server Component.
export default function BulkReviewActions({ children }: { children: React.ReactNode }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function checkboxes(): HTMLInputElement[] {
    return Array.from(
      formRef.current?.querySelectorAll<HTMLInputElement>('input[name="reviewId"]') ?? [],
    );
  }

  function selectedIds(): number[] {
    return checkboxes()
      .filter((el) => el.checked)
      .map((el) => Number(el.value));
  }

  function handleChange(e: React.ChangeEvent<HTMLFormElement>) {
    const target = e.target;
    if (target instanceof HTMLInputElement && target.name === "selectAll") {
      checkboxes().forEach((el) => (el.checked = target.checked));
    }
    setCount(selectedIds().length);
    setMessage(null);
  }

  function clearSelection() {
    checkboxes().forEach((el) => (el.checked = false));
    const all = formRef.current?.querySelector<HTMLInputElement>('input[name="selectAll"]');
    if (all) all.checked = false;
    setCount(0);
  }

  function handleBulk(action: (ids: number[]) => Promise<{ error?: string; updated?: number }>) {
    const ids = selectedIds();
    if (ids.length === 0) return;
    setMessage(null);
    startTransition(async () => {
      const result = await action(ids);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setMessage(`${result.updated} review(s) updated.`);
      clearSelection();
      router.refresh();
    });
  }

  function handleDelete() {
    const ids = selectedIds();
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} review(s) permanently?`)) return;
    handleBulk(bulkDeleteReviewsAction);
  }

  return (
    <form ref={formRef} onChange={handleChange}>
      <div className="flex flex-wrap items-center gap-3 mb-3 min-h-[34px]">
        <span className="text-sm text-gray-500">
          {count > 0 ? `${count} selected` : "Select reviews for bulk actions"}
        </span>
        <button
          type="button"
          onClick={() => handleBulk(bulkApproveReviewsAction)}
          disabled={count === 0 || pending}
          className="border border-green-600 text-green-700 rounded px-3 py-1.5 text-sm font-medium hover:bg-green-50 disabled:opacity-40"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => handleBulk(bulkHideReviewsAction)}
          disabled={count === 0 || pending}
          className="border border-amber-500 text-amber-600 rounded px-3 py-1.5 text-sm font-medium hover:bg-amber-50 disabled:opacity-40"
        >
          Hide
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={count === 0 || pending}
          className="border border-red-500 text-red-600 rounded px-3 py-1.5 text-sm font-medium hover:bg-red-50 disabled:opacity-40"
        >
          Delete
        </button>
        {message && <span className="text-sm text-gray-600">{message}</span>}
      </div>
      {children}
    </form>
  );
}
