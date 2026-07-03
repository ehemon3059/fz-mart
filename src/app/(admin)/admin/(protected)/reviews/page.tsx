import Link from "next/link";
import { listReviewsForAdmin, type ReviewFilter } from "@/server/products/reviews-admin";
import ReviewActions from "./ReviewActions";
import BulkReviewActions from "./BulkReviewActions";

const FILTERS: { key: ReviewFilter; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "hidden", label: "Hidden" },
  { key: "all", label: "All" },
];

function startOfDay(value: string): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(value: string): Date {
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Build a querystring from the active filters, overriding/clearing some keys. */
function buildQuery(
  base: { filter?: string; from?: string; to?: string },
  overrides: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  const merged = { ...base, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export default async function ReviewsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; from?: string; to?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const filter: ReviewFilter =
    sp.filter === "approved" || sp.filter === "hidden" || sp.filter === "all"
      ? sp.filter
      : "pending";
  const from = sp.from || undefined;
  const to = sp.to || undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const result = await listReviewsForAdmin({
    filter,
    from: from ? startOfDay(from) : undefined,
    to: to ? endOfDay(to) : undefined,
    page,
  });

  const base = { filter, from, to };
  const firstOnPage = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const lastOnPage = Math.min(result.page * result.pageSize, result.total);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="mt-1 text-sm text-gray-500">
          New customer reviews stay hidden until approved. Approve to publish, hide to pull back, or
          delete permanently.
        </p>
      </div>

      {/* Date range. method=get keeps the URL shareable/bookmarkable. */}
      <form method="get" className="flex flex-wrap items-end gap-3">
        {filter !== "pending" && <input type="hidden" name="filter" value={filter} />}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" className="bg-black text-white px-4 py-2 rounded text-sm font-medium">
          Apply
        </button>
        {(from || to) && (
          <Link
            href={`/admin/reviews${buildQuery({ filter }, {})}`}
            className="px-4 py-2 rounded text-sm font-medium text-gray-600 border"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/reviews${buildQuery(base, { filter: f.key, page: undefined })}`}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              filter === f.key ? "bg-black text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <p className="text-sm text-gray-500">
        {result.total === 0
          ? "No reviews in this view."
          : `Showing ${firstOnPage}–${lastOnPage} of ${result.total} reviews`}
      </p>

      {result.reviews.length > 0 && (
        <BulkReviewActions>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-4 w-10">
                    <input
                      type="checkbox"
                      name="selectAll"
                      aria-label="Select all reviews on this page"
                      className="align-middle"
                    />
                  </th>
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Rating</th>
                  <th className="py-2 pr-4">Comment</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.reviews.map((review) => (
                  <tr key={review.id} className="border-b align-top">
                    <td className="py-3 pr-4">
                      <input
                        type="checkbox"
                        name="reviewId"
                        value={review.id}
                        aria-label={`Select review ${review.id}`}
                        className="align-middle"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <Link
                        href={`/products/${review.product.slug}`}
                        className="font-medium text-gray-900 underline"
                      >
                        {review.product.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="text-gray-900">{review.customer.name ?? "—"}</div>
                      <div className="text-xs text-gray-400">{review.customer.email}</div>
                    </td>
                    <td className="py-3 pr-4 text-amber-500">
                      {"★".repeat(review.rating)}
                      <span className="text-gray-200">{"★".repeat(5 - review.rating)}</span>
                    </td>
                    <td className="py-3 pr-4 max-w-xs text-gray-700">{review.comment}</td>
                    <td className="py-3 pr-4 whitespace-nowrap text-xs text-gray-400">
                      {review.createdAt.toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 pr-4">
                      {review.status === "APPROVED" ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                          Approved
                        </span>
                      ) : review.status === "HIDDEN" ? (
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">
                          Hidden
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <ReviewActions id={review.id} status={review.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BulkReviewActions>
      )}

      {/* Pagination */}
      {result.pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Link
            href={`/admin/reviews${buildQuery(base, { page: String(result.page - 1) })}`}
            aria-disabled={result.page <= 1}
            className={`px-3 py-1.5 rounded border ${
              result.page <= 1 ? "pointer-events-none opacity-40" : "hover:border-black"
            }`}
          >
            ← Previous
          </Link>
          <span className="text-gray-500">
            Page {result.page} of {result.pageCount}
          </span>
          <Link
            href={`/admin/reviews${buildQuery(base, { page: String(result.page + 1) })}`}
            aria-disabled={result.page >= result.pageCount}
            className={`px-3 py-1.5 rounded border ${
              result.page >= result.pageCount ? "pointer-events-none opacity-40" : "hover:border-black"
            }`}
          >
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}
