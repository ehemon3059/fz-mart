import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-session";
import { listReviewsByCustomer } from "@/server/products/reviews";

export const metadata = { title: "My Reviews", robots: { index: false } };

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  HIDDEN: "bg-gray-200 text-gray-600",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending approval",
  APPROVED: "Published",
  HIDDEN: "Hidden",
};

export default async function AccountReviewsPage() {
  const session = await getCurrentCustomer();
  if (!session) redirect("/login?next=/account/reviews");

  const reviews = await listReviewsByCustomer(session.customerId);

  if (reviews.length === 0) {
    return (
      <p className="text-gray-500">
        You haven&apos;t written any reviews yet.{" "}
        <Link href="/account/purchases" className="underline">
          View your purchases
        </Link>{" "}
        to leave one.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => {
        const image = review.product.images[0]?.url ?? null;
        return (
          <div key={review.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start gap-3">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt={review.product.name} className="h-12 w-12 rounded-md object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-md bg-gray-100" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/products/${review.product.slug}`} className="font-medium text-gray-900 hover:underline">
                    {review.product.name}
                  </Link>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[review.status]}`}>
                    {STATUS_LABEL[review.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-amber-500" aria-label={`${review.rating} out of 5 stars`}>
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </p>
                <p className="mt-1 text-sm text-gray-600">{review.comment}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {review.createdAt.toLocaleDateString("en-BD", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
