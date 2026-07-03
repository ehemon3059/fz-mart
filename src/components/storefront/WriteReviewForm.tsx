"use client";

import { useState, useTransition } from "react";
import { submitReview } from "@/app/(storefront)/products/[slug]/actions";

export default function WriteReviewForm({
  productId,
  slug,
  loggedIn,
  canReview,
  blockMessage,
}: {
  productId: number;
  slug: string;
  loggedIn: boolean;
  canReview: boolean;
  blockMessage?: string;
}) {
  const [rating, setRating] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!loggedIn) {
    return (
      <p className="text-sm text-gray-500">
        <a
          href={`/login?next=${encodeURIComponent(`/products/${slug}`)}`}
          className="font-semibold text-green-700 underline"
        >
          Sign in
        </a>{" "}
        to write a review.
      </p>
    );
  }

  // Signed in, but not a verified buyer or past the 15-day window.
  if (!canReview) {
    return (
      <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500">
        {blockMessage ?? "You can't review this product right now."}
      </p>
    );
  }

  if (submitted) {
    return (
      <p className="text-sm font-medium text-green-700">
        Thanks for your review! It will appear soon.
      </p>
    );
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("rating", String(rating));
    startTransition(async () => {
      const result = await submitReview(productId, slug, formData);
      if (result?.error) setError(result.error);
      else setSubmitted(true);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <p className="text-sm font-semibold text-gray-900">Write a review</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={n <= rating ? "text-amber-400" : "text-gray-200"}
            aria-label={`${n} star`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        name="comment"
        required
        rows={3}
        placeholder="Share your experience with this product…"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-700"
      />
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
