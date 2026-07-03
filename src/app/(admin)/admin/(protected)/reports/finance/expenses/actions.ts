"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ExpenseCategory } from "@prisma/client";
import { takaToPaisa } from "@/lib/money";
import { EXPENSE_CATEGORIES } from "@/config/expense-category";
import { createExpense, updateExpense, deleteExpense } from "@/server/finance/expenses";
import { requirePermission } from "@/server/admin/guard";

export interface ActionResult {
  error?: string;
}

export async function saveExpense(
  id: number | null,
  formData: FormData,
): Promise<ActionResult> {
  await requirePermission("expenses");
  const rawCategory = String(formData.get("category") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const amountTaka = Number(formData.get("amount"));
  const incurredOnRaw = String(formData.get("incurredOn") ?? "");

  if (!EXPENSE_CATEGORIES.includes(rawCategory as ExpenseCategory)) {
    return { error: "Please choose a valid category." };
  }
  if (!description) return { error: "Description is required." };
  if (!Number.isFinite(amountTaka) || amountTaka <= 0) {
    return { error: "Amount must be greater than zero." };
  }
  const incurredOn = new Date(incurredOnRaw);
  if (Number.isNaN(incurredOn.getTime())) {
    return { error: "Please pick a valid date." };
  }

  const input = {
    category: rawCategory as ExpenseCategory,
    description,
    amount: takaToPaisa(amountTaka),
    incurredOn,
  };

  if (id) {
    await updateExpense(id, input);
  } else {
    await createExpense(input);
  }

  revalidatePath("/admin/reports/finance/expenses");
  revalidatePath("/admin/reports/finance");
  redirect("/admin/reports/finance/expenses");
}

export async function removeExpense(id: number): Promise<ActionResult> {
  await requirePermission("expenses");
  await deleteExpense(id);
  revalidatePath("/admin/reports/finance/expenses");
  revalidatePath("/admin/reports/finance");
  return {};
}
