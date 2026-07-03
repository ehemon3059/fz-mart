import Link from "next/link";
import { notFound } from "next/navigation";
import { getFaqById } from "@/server/faq/admin";
import { Icon } from "@/components/icons";
import FaqForm from "../../FaqForm";

export const metadata = { title: "Edit FAQ — FZ-Mart Admin" };

export default async function EditFaqPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const faq = await getFaqById(Number(id));
  if (!faq) notFound();

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-6 pb-28 sm:px-7 sm:py-8 lg:pb-8">
      <Link
        href="/admin/faq"
        className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-stone-500 hover:text-stone-800"
      >
        <Icon name="arrowLeft" size={16} /> Back to FAQ
      </Link>
      <h1 className="mt-3 text-[26px] font-extrabold tracking-tight text-stone-900">Edit FAQ</h1>
      <p className="mt-1 line-clamp-1 text-[14.5px] text-stone-500">{faq.question}</p>

      <div className="mt-6">
        <FaqForm faq={faq} />
      </div>
    </div>
  );
}
