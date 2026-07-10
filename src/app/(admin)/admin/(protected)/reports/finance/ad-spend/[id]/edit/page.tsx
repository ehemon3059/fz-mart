import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdSpendById } from "@/server/finance/ad-spend";
import AdSpendForm from "../../AdSpendForm";

export const metadata = { title: "Edit Ad Spend — FZ-Mart Admin" };

export default async function EditAdSpendPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const adSpend = await getAdSpendById(Number(id));
  if (!adSpend) notFound();

  return (
    <div className="mx-auto max-w-[720px] space-y-5">
      <div>
        <Link href="/admin/reports/finance/ad-spend" className="text-sm text-gray-500 hover:underline">
          ← Back to ad spend
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Edit Ad Spend</h1>
      </div>
      <AdSpendForm adSpend={adSpend} />
    </div>
  );
}
