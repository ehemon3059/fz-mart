"use client";

import { useMemo, useState } from "react";
import { SearchIcon, ChevronDown } from "@/components/storefront/icons";

type Faq = { id: number; question: string; answer: string };

export default function FaqList({ faqs }: { faqs: Faq[] }) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<number | null>(faqs[0]?.id ?? null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q),
    );
  }, [faqs, query]);

  return (
    <div>
      {/* Search */}
      <div className="relative mb-7">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
          <SearchIcon size={18} />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions…"
          className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-11 pr-4 text-[14.5px] text-stone-800 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-tint)]"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-5 py-10 text-center text-[14px] text-stone-500">
          No questions match “{query}”. Try a different search.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((faq) => {
            const open = openId === faq.id;
            return (
              <li
                key={faq.id}
                className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:border-stone-300"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : faq.id)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-[15px] font-semibold text-stone-800">{faq.question}</span>
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-500 transition ${
                      open ? "rotate-180 bg-[var(--brand-tint)] text-[var(--brand-dark)]" : "bg-stone-100"
                    }`}
                  >
                    <ChevronDown size={16} />
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-200 ease-out ${
                    open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="whitespace-pre-wrap px-5 pb-5 text-[14px] leading-relaxed text-stone-600">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
