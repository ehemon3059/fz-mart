"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/admin/guard";
import { logActivity } from "@/server/admin/audit";
import { saveNewsletterCopy } from "@/server/settings/newsletter";

export interface ActionResult {
  error?: string;
}

export async function saveNewsletterCopyAction(formData: FormData): Promise<ActionResult> {
  const admin = await requirePermission("reports");

  const title = String(formData.get("title") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim();
  if (!title) return { error: "Title is required." };
  if (!subtitle) return { error: "Subtitle is required." };
  if (title.length > 120) return { error: "Title is too long (max 120 characters)." };
  if (subtitle.length > 200) return { error: "Subtitle is too long (max 200 characters)." };

  await saveNewsletterCopy({ title, subtitle });

  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: "newsletter.copy.update",
    detail: title,
  });

  // Storefront home is where the signup box renders.
  revalidatePath("/");
  revalidatePath("/admin/subscribers");
  return {};
}
