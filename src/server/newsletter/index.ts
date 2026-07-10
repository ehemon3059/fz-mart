import { prisma } from "@/lib/prisma";

// Newsletter signups from the storefront footer box. Subscribe is idempotent
// per email (re-subscribe is a no-op), so the caller can always show the
// thank-you state. Admin reads the list here and exports it as CSV.

export class NewsletterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NewsletterError";
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribeToNewsletter(params: {
  email: string;
  name?: string | null;
  customerId?: string | null;
}): Promise<void> {
  const email = params.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    throw new NewsletterError("Enter a valid email address.");
  }
  const name = params.name?.trim() || null;

  // Idempotent: keep one row per email. A repeat submit fills in a name/link we
  // didn't have before, but never overwrites an existing name with a blank.
  await prisma.newsletterSubscriber.upsert({
    where: { email },
    create: { email, name, customerId: params.customerId ?? null },
    update: {
      name: name ?? undefined,
      customerId: params.customerId ?? undefined,
    },
  });
}

export interface SubscriberRow {
  id: number;
  email: string;
  name: string | null;
  createdAt: Date;
}

/** All subscribers, newest first — powers the admin list and the CSV export. */
export async function listSubscribers(): Promise<SubscriberRow[]> {
  return prisma.newsletterSubscriber.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, createdAt: true },
  });
}

export async function countSubscribers(): Promise<number> {
  return prisma.newsletterSubscriber.count();
}

/** RFC-4180 cell: quote when the value contains a comma, quote or newline. */
function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Build a Name,Email,Subscribed CSV from the subscriber list. */
export function buildSubscribersCsv(rows: SubscriberRow[]): string {
  const header = ["Name", "Email", "Subscribed at"];
  const lines = [header.map(csvCell).join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.name ?? ""),
        csvCell(r.email),
        csvCell(r.createdAt.toISOString()),
      ].join(","),
    );
  }
  // Prepend a UTF-8 BOM so Excel opens Bangla names / special chars correctly.
  return "﻿" + lines.join("\r\n");
}
