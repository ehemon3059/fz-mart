import type { ExpenseCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// CRUD over the Expense table — the manual OpEx entries (ads, rent, software…)
// that can't be derived from order data. Amounts are paisa, like every money
// field in the app. `incurredOn` decides which month an expense lands in on the
// P&L, so back-dating a bill is intentional and supported.

export interface ExpenseInput {
  category: ExpenseCategory;
  description: string;
  /** Paisa. */
  amount: number;
  incurredOn: Date;
}

export async function listExpensesInRange(start: Date, end: Date) {
  return prisma.expense.findMany({
    where: { incurredOn: { gte: start, lte: end } },
    orderBy: { incurredOn: "desc" },
  });
}

export async function getExpenseById(id: number) {
  return prisma.expense.findUnique({ where: { id } });
}

export async function createExpense(input: ExpenseInput) {
  return prisma.expense.create({
    data: {
      category: input.category,
      description: input.description,
      amount: input.amount,
      incurredOn: input.incurredOn,
    },
  });
}

export async function updateExpense(id: number, input: ExpenseInput) {
  return prisma.expense.update({
    where: { id },
    data: {
      category: input.category,
      description: input.description,
      amount: input.amount,
      incurredOn: input.incurredOn,
    },
  });
}

export async function deleteExpense(id: number) {
  await prisma.expense.delete({ where: { id } });
}
