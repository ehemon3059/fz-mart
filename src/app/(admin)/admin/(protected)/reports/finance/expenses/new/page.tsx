import Link from "next/link";
import ExpenseForm from "../ExpenseForm";

export const metadata = { title: "New Expense — FZ-Mart Admin" };

export default function NewExpensePage() {
  return (
    <div className="mx-auto max-w-[720px] space-y-5">
      <div>
        <Link href="/admin/reports/finance/expenses" className="text-sm text-gray-500 hover:underline">
          ← Back to expenses
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">New Expense</h1>
      </div>
      <ExpenseForm />
    </div>
  );
}
