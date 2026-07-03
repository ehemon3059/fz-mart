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

// Static grouping for the admin list UI — not admin-editable, so it lives in
// code rather than the database (mirrors PAGE_FALLBACK_TITLES).
export const CATEGORY_ORDER = [
  "Company",
  "Help & Support",
  "Orders & Shipping",
  "Promotions",
] as const;

export const PAGE_CATEGORIES: Record<(typeof PAGE_SLUGS)[number], (typeof CATEGORY_ORDER)[number]> = {
  "about-us": "Company",
  "contact-us": "Company",
  "company-information": "Company",
  "terms-and-conditions": "Company",
  "privacy-policy": "Company",
  "support-center": "Help & Support",
  "how-to-order": "Orders & Shipping",
  "order-tracking": "Orders & Shipping",
  payment: "Orders & Shipping",
  shipping: "Orders & Shipping",
  "happy-return": "Orders & Shipping",
  "refund-policy": "Orders & Shipping",
  exchange: "Orders & Shipping",
  cancellation: "Orders & Shipping",
  "pre-order": "Promotions",
  "extra-discount": "Promotions",
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
  status: "PUBLISHED" | "DRAFT";
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export async function upsertPage(slug: string, input: PageInput) {
  const page = await prisma.page.upsert({
    where: { slug },
    update: {
      title: input.title,
      content: input.content,
      status: input.status,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
    },
    create: {
      slug,
      title: input.title,
      content: input.content,
      status: input.status,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
    },
  });
  await invalidatePageCache(slug);
  return page;
}
