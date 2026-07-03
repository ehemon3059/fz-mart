import Link from "next/link";
import { listActiveFaqs } from "@/server/faq";
import FaqList from "./FaqList";

export const metadata = { title: "FAQ — FZ Mart" };

export default async function FaqPage() {
  const faqs = await listActiveFaqs();

  return (
    <div className="font-manrope mx-auto max-w-[760px] px-6 py-12">
      {/* Breadcrumb */}
      <nav className="mb-7 flex items-center gap-1.5 text-[13px] text-stone-400">
        <Link href="/" className="font-medium text-stone-500 transition hover:text-[var(--brand-dark)]">
          Home
        </Link>
        <span>/</span>
        <span className="font-medium text-stone-700">FAQ</span>
      </nav>

      {/* Header */}
      <span className="inline-flex items-center rounded-full bg-[var(--brand-tint)] px-3 py-1 text-[12.5px] font-semibold text-[var(--brand-dark)]">
        Help Center
      </span>
      <h1 className="mt-4 text-[40px] font-extrabold leading-[1.1] tracking-tight text-stone-900">
        Frequently Asked Questions
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-stone-500">
        Everything you need to know about shopping with FZ Mart — orders, delivery, payment, returns,
        and more. Can&apos;t find your answer? We&apos;re just a message away.
      </p>

      <hr className="my-9 border-stone-200" />

      {/* Accordion */}
      {faqs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-5 py-10 text-center text-[14px] text-stone-500">
          No questions have been added yet. Please check back soon.
        </p>
      ) : (
        <FaqList faqs={faqs} />
      )}

      {/* Still need help CTA */}
      <div className="mt-12 rounded-2xl border border-stone-200 bg-stone-50 px-6 py-8 text-center">
        <h2 className="text-[18px] font-bold text-stone-900">Still have questions?</h2>
        <p className="mx-auto mt-1.5 max-w-md text-[14px] text-stone-500">
          Our support team is happy to help with anything that isn&apos;t covered here.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/pages/contact-us"
            className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-[14px] font-semibold !text-white shadow-sm transition hover:bg-[var(--brand-dark)]"
          >
            Contact Us
          </Link>
          <Link
            href="/pages/support-center"
            className="rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-[14px] font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            Visit Support Center
          </Link>
        </div>
      </div>
    </div>
  );
}
