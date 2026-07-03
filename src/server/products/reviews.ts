import { prisma } from "@/lib/prisma";

export class ReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewError";
  }
}

/** A customer may review a product only within this many days of buying it. */
export const REVIEW_WINDOW_DAYS = 15;

export type ReviewBlockReason = "NOT_PURCHASED" | "WINDOW_EXPIRED";

export interface ReviewEligibility {
  canReview: boolean;
  reason?: ReviewBlockReason;
}

/** Human-readable copy for each block reason — shared by the form and the action. */
export const REVIEW_BLOCK_MESSAGE: Record<ReviewBlockReason, string> = {
  NOT_PURCHASED: "Only customers who have purchased this product can review it.",
  WINDOW_EXPIRED: `The ${REVIEW_WINDOW_DAYS}-day window to review this purchase has passed.`,
};

/**
 * Decide whether a signed-in customer may review a product.
 *
 * 1. They must have bought it — a non-cancelled order containing this product.
 * 2. The review window opens at purchase and closes after REVIEW_WINDOW_DAYS.
 *    We look at the MOST RECENT purchase so a repeat buyer always gets the
 *    longest possible window.
 */
export async function getReviewEligibility(
  customerId: string,
  productId: number,
): Promise<ReviewEligibility> {
  const latestPurchase = await prisma.order.findFirst({
    where: {
      customerId,
      status: { not: "CANCELLED" },
      items: { some: { productId } },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (!latestPurchase) {
    return { canReview: false, reason: "NOT_PURCHASED" };
  }

  const cutoff = new Date(Date.now() - REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  if (latestPurchase.createdAt < cutoff) {
    return { canReview: false, reason: "WINDOW_EXPIRED" };
  }

  return { canReview: true };
}

export async function listApprovedReviews(productId: number) {
  return prisma.productReview.findMany({
    where: { productId, status: "APPROVED" },
    include: { customer: { select: { name: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export interface RatingSummary {
  average: number;
  total: number;
  /** Count of approved reviews per star, keyed 1-5. */
  counts: Record<1 | 2 | 3 | 4 | 5, number>;
}

export async function getRatingSummary(productId: number): Promise<RatingSummary> {
  const [aggregate, grouped] = await Promise.all([
    prisma.productReview.aggregate({
      where: { productId, status: "APPROVED" },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.productReview.groupBy({
      by: ["rating"],
      where: { productId, status: "APPROVED" },
      _count: { rating: true },
    }),
  ]);

  const counts: RatingSummary["counts"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of grouped) {
    if (row.rating >= 1 && row.rating <= 5) {
      counts[row.rating as 1 | 2 | 3 | 4 | 5] = row._count.rating;
    }
  }

  return {
    average: aggregate._avg.rating ?? 0,
    total: aggregate._count.rating,
    counts,
  };
}

export interface CreateReviewInput {
  customerId: string;
  productId: number;
  rating: number;
  comment: string;
}

/**
 * One review per customer per product — re-submitting updates the existing row.
 * New and edited reviews land as pending: they stay hidden on the storefront
 * until an admin approves them, so spam never shows. Editing an already-approved
 * review resets it to pending, re-moderating the new text.
 */
export async function upsertReview(input: CreateReviewInput) {
  if (input.rating < 1 || input.rating > 5) {
    throw new ReviewError("Rating must be between 1 and 5.");
  }
  if (!input.comment.trim()) {
    throw new ReviewError("Please write a short review.");
  }

  return prisma.productReview.upsert({
    where: { productId_customerId: { productId: input.productId, customerId: input.customerId } },
    update: { rating: input.rating, comment: input.comment.trim(), status: "PENDING" },
    create: {
      productId: input.productId,
      customerId: input.customerId,
      rating: input.rating,
      comment: input.comment.trim(),
      status: "PENDING",
    },
  });
}
