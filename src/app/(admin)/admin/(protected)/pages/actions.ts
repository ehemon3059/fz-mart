"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { upsertPage, PAGE_SLUGS } from "@/server/pages/admin";
import { sanitizePageContent } from "@/server/pages/sanitize";

export interface ActionResult {
  error?: string;
}

export async function savePage(
  slug: string,
  formData: FormData,
): Promise<ActionResult> {
  if (!PAGE_SLUGS.includes(slug as (typeof PAGE_SLUGS)[number])) {
    return { error: "Unknown page." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const rawContent = String(formData.get("content") ?? "");
  const content = sanitizePageContent(rawContent);
  const status = formData.get("status") === "DRAFT" ? "DRAFT" : "PUBLISHED";

  if (!title) return { error: "Title is required." };
  // Strip tags/whitespace to detect "empty" rich text like "<p></p>".
  if (!content.replace(/<[^>]*>/g, "").trim()) {
    return { error: "Content is required." };
  }

  await upsertPage(slug, { title, content, status });

  revalidatePath("/admin/pages");
  revalidatePath(`/pages/${slug}`);
  redirect("/admin/pages");
}
