"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCustomer } from "@/lib/customer-session";
import {
  upsertReview,
  ReviewError,
  getReviewEligibility,
  REVIEW_BLOCK_MESSAGE,
} from "@/server/products/reviews";
import { prisma } from "@/lib/prisma";

export interface SubmitReviewResult {
  error?: string;
  success?: boolean;
}

export async function submitReview(
  productId: number,
  slug: string,
  formData: FormData,
): Promise<SubmitReviewResult> {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return { error: "Please sign in to leave a review." };
  }

  // Gate: only verified buyers, and only within the 15-day post-purchase window.
  const eligibility = await getReviewEligibility(customer.customerId, productId);
  if (!eligibility.canReview) {
    return { error: REVIEW_BLOCK_MESSAGE[eligibility.reason!] };
  }

  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();

  try {
    await upsertReview({ customerId: customer.customerId, productId, rating, comment });
  } catch (err) {
    if (err instanceof ReviewError) {
      return { error: err.message };
    }
    console.error("[reviews] failed to submit review:", err);
    return { error: "Something went wrong submitting your review. Please try again." };
  }

  revalidatePath(`/products/${slug}`);
  return { success: true };
}

export async function getCustomerForReviewForm() {
  const session = await getCurrentCustomer();
  if (!session) return null;
  return prisma.customer.findUnique({ where: { id: session.customerId } });
}
