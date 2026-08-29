"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCustomer } from "@/lib/customer-session";
import { toggleWishlist } from "@/server/wishlist";
import { subscribeStockNotification, StockNotifyError } from "@/server/products/stock-notify";
import { rateLimitByIp } from "@/lib/rate-limit";

export interface WishlistResult {
  error?: string;
  wishlisted?: boolean;
  /** Set when the customer must sign in first. */
  needsLogin?: boolean;
}

export async function toggleWishlistAction(productId: number, slug: string): Promise<WishlistResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { needsLogin: true };
  const wishlisted = await toggleWishlist(customer.customerId, productId);
  revalidatePath(`/products/${slug}`);
  return { wishlisted };
}

export interface NotifyResult {
  error?: string;
  success?: string;
}

export async function notifyMeAction(
  productId: number,
  variantId: number | null,
  formData: FormData,
): Promise<NotifyResult> {
  // 'open': a back-in-stock subscription is low-value to abuse and this is a
  // browsing-path action; a Redis blip shouldn't break the product page.
  const limit = await rateLimitByIp("stock-notify:ip", 15, 60 * 10, "open");
  if (!limit.allowed) return { error: "Too many requests. Please try again later." };

  const customer = await getCurrentCustomer();
  try {
    await subscribeStockNotification({
      productId,
      variantId,
      email: String(formData.get("email") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      customerId: customer?.customerId ?? null,
    });
  } catch (err) {
    if (err instanceof StockNotifyError) return { error: err.message };
    throw err;
  }
  return { success: "We'll let you know when it's back in stock." };
}
