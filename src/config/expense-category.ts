import type { ExpenseCategory } from "@prisma/client";

// Single source of truth for the manual-expense categories, mirroring the
// ExpenseCategory enum in schema.prisma. The admin expense form and the P&L
// breakdown both read from here so labels never drift from the stored values.

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "MARKETING",
  "SOFTWARE",
  "RENT",
  "SALARY",
  "UTILITIES",
  "PACKAGING",
  "OTHER",
];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  MARKETING: "Marketing & Ads",
  SOFTWARE: "Software & Hosting",
  RENT: "Rent",
  SALARY: "Salaries",
  UTILITIES: "Utilities",
  PACKAGING: "Packaging",
  OTHER: "Other",
};
