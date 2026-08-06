"use client";

import { useState, type ReactNode } from "react";
import { FileText, Truck, MessageSquare } from "lucide-react";
import ProductAccordion, { type AccordionPanel } from "./ProductAccordion";

interface Props {
  /** Rendered Markdown description (HTML string from renderMarkdown). */
  detailsHtml: string;
  /**
   * Admin-authored collapsible panels. When non-empty these REPLACE
   * `detailsHtml` in the details tab — the description stays behind for SEO
   * and search, but the accordion is what the shopper reads.
   */
  accordionPanels?: AccordionPanel[];
  shipping: ReactNode;
  reviews: ReactNode;
  reviewCount: number;
}

type TabId = "details" | "shipping" | "reviews";

const TABS: { id: TabId; label: string; short: string; Icon: typeof FileText }[] = [
  { id: "details", label: "Features & Specs", short: "Details", Icon: FileText },
  { id: "shipping", label: "Shipping & Returns", short: "Shipping", Icon: Truck },
  { id: "reviews", label: "Ratings & Reviews", short: "Reviews", Icon: MessageSquare },
];

/**
 * Lower-section tabs. One panel area, one instance of each panel — the reviews
 * panel is a server-rendered subtree containing a form, so it must never be
 * duplicated into a second (mobile) markup branch. The tab bar scrolls
 * horizontally on narrow screens instead.
 *
 * Panels are toggled with `hidden` rather than unmounted, so switching tabs
 * doesn't discard typed review text or re-request anything.
 */
export default function ProductTabs({
  detailsHtml,
  accordionPanels = [],
  shipping,
  reviews,
  reviewCount,
}: Props) {
  const [active, setActive] = useState<TabId>("details");

  const panels: Record<TabId, ReactNode> = {
    details: accordionPanels.length > 0 ? (
      <ProductAccordion panels={accordionPanels} />
    ) : detailsHtml ? (
      <div
        className="prose prose-sm sm:prose-base max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-h2:mt-8 prose-h2:mb-3 prose-h2:text-[19px] prose-h3:mt-5 prose-h3:mb-2 prose-h3:text-[15.5px] prose-p:text-slate-700 prose-li:my-1 prose-li:text-slate-700 prose-strong:text-slate-900 prose-hr:my-8 prose-table:text-sm prose-th:bg-slate-50 prose-th:text-left prose-td:align-top first:prose-h2:mt-0"
        dangerouslySetInnerHTML={{ __html: detailsHtml }}
      />
    ) : (
      <p className="py-8 text-center text-sm text-slate-400">
        No detailed description has been added for this product yet.
      </p>
    ),
    shipping,
    reviews,
  };

  return (
    <section className="mt-12">
      <div className="border-b border-slate-200">
        <div
          role="tablist"
          aria-label="Product information"
          className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map(({ id, label, short, Icon }) => {
            const on = active === id;
            return (
              <button
                key={id}
                role="tab"
                type="button"
                id={`tab-${id}`}
                aria-selected={on}
                aria-controls={`panel-${id}`}
                onClick={() => setActive(id)}
                className={[
                  "flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-3 text-[13.5px] font-semibold transition sm:px-4 sm:text-[14px]",
                  on
                    ? "text-slate-900"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
                ].join(" ")}
                // Inline so the brand var wins over the utility border colour.
                style={on ? { borderBottomColor: "var(--brand)" } : undefined}
              >
                <Icon size={16} className={on ? "" : "text-slate-400"} style={on ? { color: "var(--brand-dark)" } : undefined} />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{short}</span>
                {id === "reviews" && reviewCount > 0 && (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-600">
                    {reviewCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-6">
        {TABS.map(({ id }) => (
          <div
            key={id}
            id={`panel-${id}`}
            role="tabpanel"
            aria-labelledby={`tab-${id}`}
            className={active === id ? "" : "hidden"}
          >
            {panels[id]}
          </div>
        ))}
      </div>
    </section>
  );
}
