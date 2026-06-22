import { prisma } from "@/lib/prisma";
import { invalidatePageCache } from "./cache";

// Fixed set of footer/legal pages — admins edit content only, never
// create or delete slugs. The seed script ensures all rows exist; this
// list drives the admin listing UI even if a row hasn't been seeded yet.
export const PAGE_SLUGS = [
  "about-us",
  "contact-us",
  "company-information",
  "terms-and-conditions",
  "privacy-policy",
  "support-center",
  "how-to-order",
  "order-tracking",
  "payment",
  "shipping",
  "happy-return",
  "refund-policy",
  "exchange",
  "cancellation",
  "pre-order",
  "extra-discount",
] as const;

export const PAGE_FALLBACK_TITLES: Record<(typeof PAGE_SLUGS)[number], string> = {
  "about-us": "About Us",
  "contact-us": "Contact Us",
  "company-information": "Company Information",
  "terms-and-conditions": "Terms & Conditions",
  "privacy-policy": "Privacy Policy",
  "support-center": "Support Center",
  "how-to-order": "How to Order",
  "order-tracking": "Order Tracking",
  payment: "Payment",
  shipping: "Shipping",
  "happy-return": "Happy Return",
  "refund-policy": "Refund Policy",
  exchange: "Exchange",
  cancellation: "Cancellation",
  "pre-order": "Pre-Order",
  "extra-discount": "Extra Discount",
};

export async function listAllPages() {
  return prisma.page.findMany({
    where: { slug: { in: PAGE_SLUGS as unknown as string[] } },
    orderBy: { slug: "asc" },
  });
}

export async function getPageBySlugForAdmin(slug: string) {
  return prisma.page.findUnique({ where: { slug } });
}

export interface PageInput {
  title: string;
  content: string;
}

export async function upsertPage(slug: string, input: PageInput) {
  const page = await prisma.page.upsert({
    where: { slug },
    update: { title: input.title, content: input.content },
    create: { slug, title: input.title, content: input.content },
  });
  await invalidatePageCache(slug);
  return page;
}
