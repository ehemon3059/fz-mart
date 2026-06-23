"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { SlugChip } from "@/components/admin/pages/SlugChip";
import RichTextEditor from "./RichTextEditor";
import { savePage } from "./actions";

interface Props {
  slug: string;
  page?: { title: string; content: string; status: "PUBLISHED" | "DRAFT"; updatedAt: Date } | null;
  fallbackTitle: string;
}

function fmtDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PageForm({ slug, page, fallbackTitle }: Props) {
  const [title, setTitle] = useState(page?.title ?? fallbackTitle);
  const [content, setContent] = useState(page?.content ?? "");
  const [status, setStatus] = useState<"PUBLISHED" | "DRAFT">(page?.status ?? "PUBLISHED");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    const formData = new FormData();
    formData.set("title", title);
    formData.set("content", content);
    formData.set("status", status);

    startTransition(async () => {
      const result = await savePage(slug, formData);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="font-manrope">
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] items-center gap-3 px-7 py-3.5">
          <Link
            href="/admin/pages"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-500 transition hover:bg-stone-50 hover:text-stone-800"
          >
            <Icon name="arrowLeft" size={17} />
          </Link>

          <div className="flex items-center gap-1.5 text-[13.5px] text-stone-400">
            <Link
              href="/admin/pages"
              className="font-medium text-stone-500 transition hover:text-stone-800"
            >
              Pages
            </Link>
            <Icon name="chevronRight" size={14} />
            <span>Edit</span>
            <Icon name="chevronRight" size={14} />
            <span className="font-semibold text-stone-800">{title}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href={`/pages/${slug}`}
              target="_blank"
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3.5 py-2 text-[13.5px] font-semibold text-stone-600 transition hover:bg-stone-50"
            >
              <Icon name="eye" size={16} /> Preview
            </Link>
            <button
              onClick={handleSave}
              disabled={pending}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
            >
              <Icon name="save" size={16} />
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-6 px-7 py-8 lg:grid-cols-[1fr_320px]">
        {/* Left: editor card */}
        <div className="rounded-2xl border border-stone-200 bg-white shadow-soft">
          <div className="border-b border-stone-100 px-6 pb-5 pt-6">
            <label className="mb-1.5 block text-[12.5px] font-semibold uppercase tracking-wide text-stone-400">
              Page title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3.5 py-2.5 text-[17px] font-semibold text-stone-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
            />
          </div>

          <RichTextEditor defaultValue={content} onChange={setContent} />
        </div>

        {/* Right: settings sidebar */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-soft">
            <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-stone-500">
              Page settings
            </h3>

            <label className="mb-1.5 block text-[12.5px] font-medium text-stone-500">
              URL slug
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5">
              <span className="font-mono text-[13px] text-stone-400">fz-mart.com</span>
              <SlugChip slug={slug} />
              <span className="ml-auto rounded bg-stone-200/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-stone-500">
                Locked
              </span>
            </div>

            <div className="my-5 h-px bg-stone-100" />

            <label className="mb-2 block text-[12.5px] font-medium text-stone-500">Status</label>
            <div className="flex rounded-lg bg-stone-100 p-1">
              {(["PUBLISHED", "DRAFT"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={[
                    "flex-1 rounded-md py-1.5 text-[13px] font-semibold transition",
                    status === s
                      ? s === "PUBLISHED"
                        ? "bg-white text-brand-700 shadow-sm"
                        : "bg-white text-stone-700 shadow-sm"
                      : "text-stone-400 hover:text-stone-600",
                  ].join(" ")}
                >
                  {s === "PUBLISHED" ? "Published" : "Draft"}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[12px] leading-snug text-stone-400">
              {status === "PUBLISHED"
                ? "Visible to all customers on the storefront."
                : "Hidden from customers until published."}
            </p>

            {page && (
              <>
                <div className="my-5 h-px bg-stone-100" />
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-stone-500">Last updated</span>
                  <span className="font-medium text-stone-700">{fmtDate(page.updatedAt)}</span>
                </div>
              </>
            )}
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
              {error}
            </p>
          )}

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-soft">
            <button
              onClick={handleSave}
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
            >
              <Icon name="save" size={16} />
              {pending ? "Saving…" : "Save changes"}
            </button>
            <Link
              href="/admin/pages"
              className="mt-2.5 flex w-full items-center justify-center rounded-lg border border-stone-200 py-2.5 text-[14px] font-semibold text-stone-600 transition hover:bg-stone-50"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
