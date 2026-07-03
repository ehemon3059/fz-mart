"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createFaq, updateFaq, deleteFaq } from "@/server/faq/admin";
import { requirePermission } from "@/server/admin/guard";

export interface ActionResult {
  error?: string;
}

export async function saveFaq(
  id: number | null,
  formData: FormData,
): Promise<ActionResult> {
  await requirePermission("faq");
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const isActive = formData.get("isActive") === "on";

  if (!question) return { error: "Question is required." };
  if (!answer) return { error: "Answer is required." };

  if (id) {
    await updateFaq(id, { question, answer, sortOrder, isActive });
  } else {
    await createFaq({ question, answer, sortOrder, isActive });
  }

  revalidatePath("/admin/faq");
  revalidatePath("/pages/faq");
  redirect("/admin/faq");
}

export async function removeFaq(id: number): Promise<ActionResult> {
  await requirePermission("faq");
  await deleteFaq(id);
  revalidatePath("/admin/faq");
  revalidatePath("/pages/faq");
  return {};
}
