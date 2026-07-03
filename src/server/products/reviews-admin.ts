import type { Prisma, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { invalidateProductCaches } from "./cache";

// Admin-side review moderation. Storefront reads live in reviews.ts; writes
// that change visibility live here so the split mirrors index.ts vs admin.ts.
//
// Approving/hiding/deleting a review changes what the public rating summary
// and review list show, so each mutation invalidates that product's cache.

export const REVIEWS_PAGE_SIZE = 20;

export type ReviewFilter = "pending" | "approved" | "hidden" | "all";

const FILTER_TO_STATUS: Record<Exclude<ReviewFilter, "all">, ReviewStatus> = {
  pending: "PENDING",
  approved: "APPROVED",
  hidden: "HIDDEN",
};

export interface ReviewListFilter {
  filter?: ReviewFilter;
  /** Inclusive lower bound on createdAt. */
  from?: Date;
  /** Inclusive upper bound on createdAt. */
  to?: Date;
  /** 1-based page number. */
  page?: number;
  pageSize?: number;
}

export interface ReviewListResult {
  reviews: Prisma.ProductReviewGetPayload<{
    include: {
      customer: { select: { name: true; email: true } };
      product: { select: { name: true; slug: true } };
    };
  }>[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/** Paginated, date-filterable review list for the admin table. */
export async function listReviewsForAdmin(
  filter: ReviewListFilter = {},
): Promise<ReviewListResult> {
  const pageSize = filter.pageSize ?? REVIEWS_PAGE_SIZE;
  const page = Math.max(1, filter.page ?? 1);

  const where: Prisma.ProductReviewWhereInput = {};
  if (filter.filter && filter.filter !== "all") {
    where.status = FILTER_TO_STATUS[filter.filter];
  }
  if (filter.from || filter.to) {
    where.createdAt = {
      ...(filter.from ? { gte: filter.from } : {}),
      ...(filter.to ? { lte: filter.to } : {}),
    };
  }

  const [reviews, total] = await Promise.all([
    prisma.productReview.findMany({
      where,
      include: {
        customer: { select: { name: true, email: true } },
        product: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.productReview.count({ where }),
  ]);

  return {
    reviews,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function countPendingReviews(): Promise<number> {
  return prisma.productReview.count({ where: { status: "PENDING" } });
}

async function invalidateForReview(reviewId: number): Promise<void> {
  const review = await prisma.productReview.findUnique({
    where: { id: reviewId },
    select: { productId: true, product: { select: { slug: true } } },
  });
  if (review) {
    await invalidateProductCaches({ productId: review.productId, slug: review.product.slug });
  }
}

export async function approveReview(reviewId: number): Promise<void> {
  await prisma.productReview.update({ where: { id: reviewId }, data: { status: "APPROVED" } });
  await invalidateForReview(reviewId);
}

/** Pull a review back off the storefront without deleting it. */
export async function hideReview(reviewId: number): Promise<void> {
  await prisma.productReview.update({ where: { id: reviewId }, data: { status: "HIDDEN" } });
  await invalidateForReview(reviewId);
}

export async function deleteReview(reviewId: number): Promise<void> {
  // Capture the product before deleting so we can invalidate its cache after.
  const review = await prisma.productReview.findUnique({
    where: { id: reviewId },
    select: { productId: true, product: { select: { slug: true } } },
  });
  await prisma.productReview.delete({ where: { id: reviewId } });
  if (review) {
    await invalidateProductCaches({ productId: review.productId, slug: review.product.slug });
  }
}

export interface BulkReviewResult {
  updated: number;
}

/** Apply the same status change to many reviews at once (bulk Approve/Hide). */
export async function bulkUpdateReviewStatus(
  reviewIds: number[],
  status: ReviewStatus,
): Promise<BulkReviewResult> {
  const reviews = await prisma.productReview.findMany({
    where: { id: { in: reviewIds } },
    select: { productId: true, product: { select: { slug: true } } },
  });
  const { count } = await prisma.productReview.updateMany({
    where: { id: { in: reviewIds } },
    data: { status },
  });

  const seen = new Set<number>();
  for (const review of reviews) {
    if (seen.has(review.productId)) continue;
    seen.add(review.productId);
    await invalidateProductCaches({ productId: review.productId, slug: review.product.slug });
  }

  return { updated: count };
}

export async function bulkDeleteReviews(reviewIds: number[]): Promise<BulkReviewResult> {
  const reviews = await prisma.productReview.findMany({
    where: { id: { in: reviewIds } },
    select: { productId: true, product: { select: { slug: true } } },
  });
  const { count } = await prisma.productReview.deleteMany({
    where: { id: { in: reviewIds } },
  });

  const seen = new Set<number>();
  for (const review of reviews) {
    if (seen.has(review.productId)) continue;
    seen.add(review.productId);
    await invalidateProductCaches({ productId: review.productId, slug: review.product.slug });
  }

  return { updated: count };
}
