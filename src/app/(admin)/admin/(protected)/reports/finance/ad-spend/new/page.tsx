import Link from "next/link";
import AdSpendForm from "../AdSpendForm";

export const metadata = { title: "New Ad Spend — FZ-Mart Admin" };

export default function NewAdSpendPage() {
  return (
    <div className="mx-auto max-w-[720px] space-y-5">
      <div>
        <Link href="/admin/reports/finance/ad-spend" className="text-sm text-gray-500 hover:underline">
          ← Back to ad spend
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">New Ad Spend</h1>
      </div>
      <AdSpendForm />
    </div>
  );
}
