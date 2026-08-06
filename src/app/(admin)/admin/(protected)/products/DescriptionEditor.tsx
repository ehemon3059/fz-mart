"use client";

/**
 * Markdown description editor for the product form.
 *
 * Replaces the old plain textarea (and the Specifications / Features cards
 * that used to live beside it) — the whole product story is now one authored
 * Markdown document. Everything is typed by the admin: the toolbar, the emoji
 * bundles and the section snippets only insert text at the cursor.
 *
 * The toolbar itself lives in ./MarkdownToolbar, shared with the accordion
 * panel editor so both authoring surfaces offer the same buttons. Only the
 * snippets below are description-specific.
 */

import { useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { renderMarkdown } from "@/lib/markdown";
import MarkdownToolbar, { useMarkdownActions, type MarkdownSnippet } from "./MarkdownToolbar";

interface Props {
  value: string;
  onChange: (md: string) => void;
  maxLength?: number;
}

/* ─────────── section snippets ─────────── */
const SNIPPETS: MarkdownSnippet[] = [
  {
    label: "🛍️ Product intro",
    hint: "Headline + hook",
    md: `## 🛍️ Product name here

**One-line hook — the single best reason to buy.**
*Who it is for, and what problem it solves.*
`,
  },
  {
    label: "⚙️ Technical specifications",
    hint: "Spec table + highlights",
    md: `## ⚙️ Technical Specifications

| Attribute | Detail |
| --- | --- |
| **📐 Dimensions** | value |
| **🔋 Battery** | value |
| **🔌 Charging** | value |
| **📶 Connectivity** | value |

### ⚡ Performance Highlights
* 🔹 **Spec name** — what it means for the buyer
* 🔹 **Spec name** — benefit
`,
  },
  {
    label: "📌 Key features",
    hint: "Bullets + box contents",
    md: `## 📌 Key Features

* ✅ **Feature** — one-line benefit
* ✅ **Feature** — one-line benefit
* 👉 **Feature** — one-line benefit

### 📍 What's in the Box
* ▪️ Item 1
* ▪️ Item 2
`,
  },
  {
    label: "💰 Price & offers",
    hint: "Price, discount, payment",
    md: `## 💰 Price & Offers

* 🏷️ **Price:** ৳0 *(regular ৳0)*
* 💥 **Save:** ৳0 — 0% off
* 🎁 **Bundle offer:** detail
* 💳 **Payment:** Cash on Delivery · bKash · Nagad · Card
`,
  },
  {
    label: "🚚 Shipping & returns",
    hint: "Delivery charges + returns",
    md: `## 🚚 Shipping & Delivery

* 📍 **Inside Dhaka:** ৳0 — ⏳ 1–2 business days
* 🚛 **Outside Dhaka:** ৳0 — ⏳ 2–4 business days
* 📦 **Free delivery** on orders over ৳0

### 🔄 Returns
* 🔹 7-day easy return on unused items in original packaging
* 🔹 Damaged or wrong item? Full replacement at no cost

*Unboxing video required for damage claims.*
`,
  },
  {
    label: "🛡️ Warranty & support",
    hint: "Guarantee + contact",
    md: `## 🛡️ Warranty & Support

* 🏅 **Warranty:** duration official warranty
* 🔒 **100% authentic** — sourced from authorised distributors
* ✅ **Quality checked** before dispatch
* ⭐ **Support:** phone · 10 AM – 8 PM, daily

*Warranty covers manufacturing defects only; physical or liquid damage is excluded.*
`,
  },
];

/** Every snippet in order — the one-click starting point for a new product. */
const FULL_LAYOUT = SNIPPETS.map((s) => s.md.trim()).join("\n\n---\n\n") + "\n";

export default function DescriptionEditor({ value, onChange, maxLength = 8000 }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const actions = useMarkdownActions(ref, value, onChange, maxLength);

  const remaining = maxLength - value.length;

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      {/* tabs */}
      <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/70 px-2 py-1.5">
        <div className="flex items-center gap-1">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={[
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-semibold capitalize transition",
                tab === t ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800",
              ].join(" ")}
            >
              <Icon name={t === "write" ? "pencil" : "eye"} size={14} /> {t}
            </button>
          ))}
        </div>
        <span className={`pr-1 text-[11.5px] font-medium ${remaining < 200 ? "text-amber-600" : "text-stone-400"}`}>
          {value.length}/{maxLength}
        </span>
      </div>

      {tab === "write" ? (
        <>
          <MarkdownToolbar
            actions={actions}
            snippets={SNIPPETS}
            fullLayout={{ label: "✨ Insert the full layout", md: FULL_LAYOUT }}
          />

          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={14}
            maxLength={maxLength}
            spellCheck
            placeholder={
              "Write the product story in Markdown.\n\n## ⚙️ Technical Specifications\n| Attribute | Detail |\n| --- | --- |\n| **📐 Size** | 30 × 20 cm |\n\n* ✅ **Feature** — why it matters\n\nUse “Add section” to drop in a ready-made block."
            }
            className="block w-full resize-y bg-white px-3.5 py-3 font-spline-mono text-[13px] leading-[1.7] text-stone-800 outline-none placeholder:text-stone-300"
          />

          <p className="border-t border-stone-100 bg-stone-50/40 px-3 py-2 text-[11.5px] text-stone-400">
            <strong className="font-semibold text-stone-500">Markdown:</strong> <code>## Title</code> ·{" "}
            <code>### Sub-title</code> · <code>**bold**</code> · <code>*italic*</code> · <code>* bullet</code> ·{" "}
            <code>---</code> divider. Switch to <strong className="font-semibold text-stone-500">Preview</strong> to see
            exactly what customers get.
          </p>
        </>
      ) : (
        <div className="min-h-[300px] px-4 py-4">
          {value.trim() ? (
            <div
              className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-stone-900 prose-h2:mb-2 prose-h2:mt-5 prose-h2:text-[17px] prose-h3:mb-1.5 prose-h3:mt-4 prose-h3:text-[14.5px] prose-p:text-stone-700 prose-strong:text-stone-900 prose-li:my-0.5 prose-li:text-stone-700 prose-table:text-[13px] prose-th:text-left prose-hr:my-5 first:prose-h2:mt-0"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
            />
          ) : (
            <p className="py-10 text-center text-[13px] text-stone-400">
              Nothing to preview yet — write the description first.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
