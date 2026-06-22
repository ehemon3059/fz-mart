import { notFound } from "next/navigation";
import { getFaqById } from "@/server/faq/admin";
import FaqForm from "../../FaqForm";

export default async function EditFaqPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const faq = await getFaqById(Number(id));
  if (!faq) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit FAQ</h1>
      <FaqForm faq={faq} />
    </div>
  );
}
