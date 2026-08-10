"use client";

/**
 * The "Size Chart" link beside the size row, and the dialog behind it.
 *
 * The chart is admin-authored Markdown rendered to HTML on the SERVER (see the
 * product page), so the markdown parser stays out of the client bundle and the
 * table ships in the initial HTML where crawlers can read it. That HTML came
 * from renderMarkdown, which escapes its input before parsing — the same safety
 * story as the accordion panels.
 */

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function SizeChartModal({ html, label }: { html: string; label: string }) {
  const [open, setOpen] = useState(false);

  // Escape closes; the body stops scrolling behind the dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[13px] font-semibold text-brand-600 underline underline-offset-2 transition hover:text-brand-700"
      >
        Size Chart
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${label} chart`}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            // Clicks inside must not fall through to the backdrop's close.
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl"
          >
            <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-3.5">
              <h2 className="text-[15px] font-bold text-slate-900">{label} chart</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close size chart"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={17} />
              </button>
            </div>
            <div className="fz-chart px-5 py-4" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      )}
    </>
  );
}
