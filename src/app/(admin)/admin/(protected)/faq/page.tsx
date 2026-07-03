import Link from "next/link";
import { listAllFaqs } from "@/server/faq/admin";
import { Icon } from "@/components/icons";
import DeleteButton from "@/components/admin/DeleteButton";
import { removeFaq } from "./actions";

export const metadata = { title: "FAQ — FZ-Mart Admin" };

export default async function AdminFaqPage() {
  const faqs = await listAllFaqs();

  const active = faqs.filter((f) => f.isActive).length;
  const stats = [
    { label: "Total questions", value: faqs.length, sub: "in help center", tone: "neutral" as const },
    { label: "Published", value: active, sub: "live on storefront", tone: "brand" as const },
    { label: "Hidden", value: faqs.length - active, sub: "inactive", tone: "neutral" as const },
  ];

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-6 pb-28 sm:px-7 sm:py-8 lg:pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-stone-900">FAQ</h1>
          <p className="mt-1 text-[14.5px] text-stone-500">
            Questions shown in your storefront help center — {faqs.length} total.
          </p>
        </div>
        <Link
          href="/admin/faq/new"
          className="hidden items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-brand-700 lg:flex"
        >
          <Icon name="plus" size={17} /> New FAQ
        </Link>
        <Link
          href="/admin/faq/new"
          aria-label="New FAQ"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm lg:hidden"
        >
          <Icon name="plus" size={20} />
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`rounded-xl border border-stone-200 bg-white p-4 shadow-soft ${
              i === 2 ? "col-span-2 sm:col-span-1" : ""
            }`}
          >
            <p className="text-[12.5px] font-medium text-stone-500">{s.label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={[
                  "text-[26px] font-extrabold tracking-tight sm:text-[28px]",
                  s.tone === "brand" ? "text-brand-600" : "text-stone-900",
                ].join(" ")}
              >
                {s.value}
              </span>
              <span className="text-[12px] text-stone-400">{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="mt-6">
        {faqs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white py-16 text-center shadow-soft">
            <p className="text-[15px] font-semibold text-stone-700">No questions yet</p>
            <p className="mt-1 text-[13.5px] text-stone-400">
              Add common questions to help customers self-serve.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold text-stone-900">{faq.question}</span>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${
                          faq.isActive
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {faq.isActive ? "Published" : "Hidden"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-stone-500">{faq.answer}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/admin/faq/${faq.id}/edit`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                      aria-label="Edit"
                    >
                      <Icon name="pencil" size={16} />
                    </Link>
                    <DeleteButton action={removeFaq} id={faq.id} label="FAQ" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200 bg-white p-4 lg:hidden">
        <Link
          href="/admin/faq/new"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-[15px] font-semibold text-white shadow"
        >
          <Icon name="plus" size={19} /> New FAQ
        </Link>
      </div>
    </div>
  );
}
