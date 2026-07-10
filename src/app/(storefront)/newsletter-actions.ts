"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-session";
import { subscribeToNewsletter, NewsletterError } from "@/server/newsletter";

export interface SubscribeResult {
  ok?: boolean;
  error?: string;
}

/**
 * Storefront newsletter signup. The box only asks for an email; when the
 * visitor is a logged-in customer we attach their account name + id so the
 * admin export carries a name. Idempotent per email.
 */
export async function subscribeNewsletter(formData: FormData): Promise<SubscribeResult> {
  const email = String(formData.get("email") ?? "");

  // Auto-fill the name from the logged-in customer, if any.
  let name: string | null = null;
  let customerId: string | null = null;
  const session = await getCurrentCustomer();
  if (session) {
    customerId = session.customerId;
    const customer = await prisma.customer.findUnique({
      where: { id: session.customerId },
      select: { name: true },
    });
    name = customer?.name ?? null;
  }

  try {
    await subscribeToNewsletter({ email, name, customerId });
    return { ok: true };
  } catch (err) {
    if (err instanceof NewsletterError) return { error: err.message };
    console.error("[newsletter] subscribe failed:", err);
    return { error: "Something went wrong. Please try again." };
  }
}
