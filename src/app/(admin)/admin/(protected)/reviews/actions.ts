"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/admin/guard";
import {
  approveReview,
  hideReview,
  deleteReview,
  bulkUpdateReviewStatus,
  bulkDeleteReviews,
} from "@/server/products/reviews-admin";

export interface ActionResult {
  error?: string;
}

export interface BulkActionResult extends ActionResult {
  updated?: number;
}

export async function approveReviewAction(id: number): Promise<ActionResult> {
  await requirePermission("reviews");
  try {
    await approveReview(id);
  } catch {
    return { error: "Could not approve review." };
  }
  revalidatePath("/admin/reviews");
  return {};
}

export async function hideReviewAction(id: number): Promise<ActionResult> {
  await requirePermission("reviews");
  try {
    await hideReview(id);
  } catch {
    return { error: "Could not hide review." };
  }
  revalidatePath("/admin/reviews");
  return {};
}

export async function deleteReviewAction(id: number): Promise<ActionResult> {
  await requirePermission("reviews");
  try {
    await deleteReview(id);
  } catch {
    return { error: "Could not delete review." };
  }
  revalidatePath("/admin/reviews");
  return {};
}

export async function bulkApproveReviewsAction(ids: number[]): Promise<BulkActionResult> {
  await requirePermission("reviews");
  if (ids.length === 0) return { error: "No reviews selected." };
  const { updated } = await bulkUpdateReviewStatus(ids, "APPROVED");
  revalidatePath("/admin/reviews");
  return { updated };
}

export async function bulkHideReviewsAction(ids: number[]): Promise<BulkActionResult> {
  await requirePermission("reviews");
  if (ids.length === 0) return { error: "No reviews selected." };
  const { updated } = await bulkUpdateReviewStatus(ids, "HIDDEN");
  revalidatePath("/admin/reviews");
  return { updated };
}

export async function bulkDeleteReviewsAction(ids: number[]): Promise<BulkActionResult> {
  await requirePermission("reviews");
  if (ids.length === 0) return { error: "No reviews selected." };
  const { updated } = await bulkDeleteReviews(ids);
  revalidatePath("/admin/reviews");
  return { updated };
}
