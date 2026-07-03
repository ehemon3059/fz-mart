import Link from "next/link";
import { notFound } from "next/navigation";
import { getExpenseById } from "@/server/finance/expenses";
import ExpenseForm from "../../ExpenseForm";

export const metadata = { title: "Edit Expense — FZ-Mart Admin" };

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const expense = await getExpenseById(Number(id));
  if (!expense) notFound();

  return (
    <div className="mx-auto max-w-[720px] space-y-5">
      <div>
        <Link href="/admin/reports/finance/expenses" className="text-sm text-gray-500 hover:underline">
          ← Back to expenses
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Edit Expense</h1>
      </div>
      <ExpenseForm expense={expense} />
    </div>
  );
}
