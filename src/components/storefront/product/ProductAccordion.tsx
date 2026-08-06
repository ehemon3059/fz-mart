"use client";

/**
 * Collapsible "Features & Specs" panels, authored in the admin's Accordion
 * Builder. Shown in place of the flat Markdown description whenever a product
 * has any sections (see ProductTabs).
 *
 * Content arrives as HTML already rendered by `renderMarkdown` on the server —
 * that renderer escapes its input before parsing, so admin-pasted raw HTML is
 * shown as literal text rather than executed. Rendering server-side also keeps
 * the markdown parser out of the client bundle and puts the full text in the
 * initial HTML, where crawlers can read it even while panels are collapsed.
 *
 * Panels are independent (opening one never closes another) and stay mounted
 * whether open or closed, so in-page search (Ctrl+F) and SEO see everything.
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface AccordionPanel {
  id: number;
  title: string;
  /** Leading emoji; null/empty renders the title alone. */
  icon: string | null;
  /** Pre-rendered HTML from renderMarkdown. */
  contentHtml: string;
  /** Whether this panel starts expanded on first paint. */
  isOpen: boolean;
}

export default function ProductAccordion({ panels }: { panels: AccordionPanel[] }) {
  // Seeded from each panel's admin-set default; a shopper's click overrides it
  // for the rest of the visit.
  const [open, setOpen] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(panels.map((p) => [p.id, p.isOpen])),
  );

  if (panels.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {panels.map((panel) => {
        const isOpen = open[panel.id] ?? false;
        const panelId = `accordion-panel-${panel.id}`;
        const buttonId = `accordion-button-${panel.id}`;
        return (
          <div
            key={panel.id}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-300"
          >
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen((o) => ({ ...o, [panel.id]: !isOpen }))}
                className="flex w-full items-center justify-between gap-3 bg-slate-50/70 px-4 py-3.5 text-left transition hover:bg-slate-100/70 sm:px-5"
              >
                <span className="flex min-w-0 items-center gap-2.5 text-[14.5px] font-semibold text-slate-900 sm:text-[15.5px]">
                  {panel.icon && (
                    <span aria-hidden className="shrink-0 text-[17px]">
                      {panel.icon}
                    </span>
                  )}
                  <span className="min-w-0">{panel.title}</span>
                </span>
                <ChevronDown
                  size={18}
                  aria-hidden
                  className={`shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
            </h3>

            {/* Kept mounted and only visually hidden: collapsed copy still ships
                in the HTML for crawlers and Ctrl+F. */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="border-t border-slate-100 px-4 py-4 sm:px-5"
            >
              <div
                className="prose prose-sm sm:prose-base max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-h3:mt-4 prose-h3:mb-2 prose-h3:text-[15px] prose-p:text-slate-700 prose-li:my-1 prose-li:text-slate-700 prose-strong:text-slate-900 prose-table:text-sm prose-th:bg-slate-50 prose-th:text-left prose-td:align-top first:prose-h3:mt-0"
                dangerouslySetInnerHTML={{ __html: panel.contentHtml }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
