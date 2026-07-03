"use client";

import { useState, useTransition } from "react";
import type { ReviewStatus } from "@prisma/client";
import { approveReviewAction, hideReviewAction, deleteReviewAction } from "./actions";

export default function ReviewActions({ id, status }: { id: number; status: ReviewStatus }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: (id: number) => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn(id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {status === "APPROVED" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(hideReviewAction)}
          className="rounded border border-amber-500 px-2.5 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-50 disabled:opacity-50"
        >
          Hide
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(approveReviewAction)}
          className="rounded border border-green-600 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50"
        >
          Approve
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Delete this review permanently?")) run(deleteReviewAction);
        }}
        className="rounded border border-red-500 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Delete
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
