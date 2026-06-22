"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { upsertPage, PAGE_SLUGS } from "@/server/pages/admin";

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
  const content = String(formData.get("content") ?? "").trim();

  if (!title) return { error: "Title is required." };
  if (!content) return { error: "Content is required." };

  await upsertPage(slug, { title, content });

  revalidatePath("/admin/pages");
  revalidatePath(`/pages/${slug}`);
  redirect("/admin/pages");
}
