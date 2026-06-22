import Link from "next/link";
import { listAllFaqs } from "@/server/faq/admin";
import DeleteButton from "@/components/admin/DeleteButton";
import { removeFaq } from "./actions";

export default async function AdminFaqPage() {
  const faqs = await listAllFaqs();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">FAQ</h1>
        <Link
          href="/admin/faq/new"
          className="bg-black text-white px-4 py-2 rounded text-sm font-medium"
        >
          + New FAQ
        </Link>
      </div>

      <div className="space-y-4">
        {faqs.map((faq) => (
          <div key={faq.id} className="border rounded-lg bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold">{faq.question}</span>
                {!faq.isActive && (
                  <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex gap-3 text-sm">
                <Link href={`/admin/faq/${faq.id}/edit`} className="underline">
                  Edit
                </Link>
                <DeleteButton action={removeFaq} id={faq.id} label="FAQ" />
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-500">{faq.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
