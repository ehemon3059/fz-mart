import Link from "next/link";
import { Icon } from "@/components/icons";
import FaqForm from "../FaqForm";

export const metadata = { title: "New FAQ — FZ-Mart Admin" };

export default function NewFaqPage() {
  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-6 pb-28 sm:px-7 sm:py-8 lg:pb-8">
      <Link
        href="/admin/faq"
        className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-stone-500 hover:text-stone-800"
      >
        <Icon name="arrowLeft" size={16} /> Back to FAQ
      </Link>
      <h1 className="mt-3 text-[26px] font-extrabold tracking-tight text-stone-900">New FAQ</h1>
      <p className="mt-1 text-[14.5px] text-stone-500">Add a question to your help center.</p>

      <div className="mt-6">
        <FaqForm />
      </div>
    </div>
  );
}
