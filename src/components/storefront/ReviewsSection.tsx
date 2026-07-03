import StarRating from "./StarRating";
import WriteReviewForm from "./WriteReviewForm";
import {
  getRatingSummary,
  listApprovedReviews,
  getReviewEligibility,
  REVIEW_BLOCK_MESSAGE,
} from "@/server/products/reviews";
import { getCurrentCustomer } from "@/lib/customer-session";

export default async function ReviewsSection({
  productId,
  slug,
}: {
  productId: number;
  slug: string;
}) {
  const [summary, reviews, customer] = await Promise.all([
    getRatingSummary(productId),
    listApprovedReviews(productId),
    getCurrentCustomer(),
  ]);

  // Only verified buyers within the post-purchase window may write a review.
  const eligibility = customer
    ? await getReviewEligibility(customer.customerId, productId)
    : null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold text-gray-900">Rating &amp; Reviews</h2>

      <div className="mt-4 grid gap-6 md:grid-cols-[260px_1fr]">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold text-gray-900">{summary.average.toFixed(1)}</span>
            <span className="text-gray-400">/ 5</span>
          </div>
          <div className="mt-2 space-y-1">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const pct = summary.total > 0 ? (summary.counts[star] / summary.total) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-3">{star}</span>
                  <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                    <div className="h-1.5 rounded-full bg-green-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-sm text-gray-500">({summary.total} reviews)</p>

          <div className="mt-6">
            <WriteReviewForm
              productId={productId}
              slug={slug}
              loggedIn={!!customer}
              canReview={eligibility?.canReview ?? false}
              blockMessage={eligibility?.reason ? REVIEW_BLOCK_MESSAGE[eligibility.reason] : undefined}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {reviews.length === 0 && (
            <p className="text-sm text-gray-500">No reviews yet — be the first to review this product.</p>
          )}
          {reviews.map((review) => (
            <div key={review.id} className="rounded-lg border border-gray-200 p-4">
              <p className="font-semibold text-gray-900">{review.customer.name ?? "Anonymous"}</p>
              <div className="mt-1">
                <StarRating rating={review.rating} />
              </div>
              <p className="mt-2 text-sm text-gray-600">&quot;{review.comment}&quot;</p>
              <p className="mt-3 text-xs text-gray-400">
                {review.createdAt.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
