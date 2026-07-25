"use client";

/**
 * Markdown description editor for the product form.
 *
 * Replaces the old plain textarea (and the Specifications / Features cards
 * that used to live beside it) — the whole product story is now one authored
 * Markdown document. Everything is typed by the admin: the toolbar, the emoji
 * bundles and the section snippets only insert text at the cursor.
 */

import { useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { renderMarkdown } from "@/lib/markdown";

interface Props {
  value: string;
  onChange: (md: string) => void;
  maxLength?: number;
}

/* ─────────── emoji bundles ─────────── */
/** Categories mirror the sections a product description is built from, so the
 *  picker doubles as a reminder of which icon belongs where. */
const EMOJI_BUNDLES: { label: string; tab: string; emojis: string[] }[] = [
  { tab: "💰", label: "Pricing & Offers", emojis: ["🏷️", "💳", "💵", "🎁", "⚡", "🛍️", "💥", "🔥", "🪙", "📉"] },
  { tab: "🚚", label: "Shipping & Delivery", emojis: ["📦", "🚚", "✈️", "📍", "⏳", "🏠", "🚛", "🗺️", "⏱️", "🔄"] },
  { tab: "⚙️", label: "Specs & Performance", emojis: ["🔋", "📱", "🔌", "💡", "⚡", "📐", "🖥️", "⚙️", "📶", "🎧"] },
  { tab: "🛡️", label: "Trust & Quality", emojis: ["✨", "🏅", "🔒", "🛡️", "👑", "✅", "⭐", "🤝", "🧾", "♻️"] },
  { tab: "📌", label: "Bullets & Pointers", emojis: ["🔹", "👉", "▪️", "📍", "✅", "💡", "➡️", "✔️", "❗", "⭕"] },
];

/* ─────────── section snippets ─────────── */
const SNIPPETS: { label: string; hint: string; md: string }[] = [
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

/* ─────────── small UI atoms ─────────── */
function TB({
  title,
  onClick,
  icon,
  text,
}: {
  title: string;
  onClick: () => void;
  icon?: IconName;
  text?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()} // keep the textarea selection
      onClick={onClick}
      className="flex h-8 min-w-[2rem] items-center justify-center rounded-md px-1.5 text-[13px] font-bold text-stone-600 transition hover:bg-white hover:text-stone-900 hover:shadow-sm"
    >
      {text ?? (icon ? <Icon name={icon} size={16} strokeWidth={2} /> : null)}
    </button>
  );
}

const Divider = () => <span className="mx-1 h-5 w-px bg-stone-200" />;

export default function DescriptionEditor({ value, onChange, maxLength = 8000 }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [menu, setMenu] = useState<"emoji" | "snippet" | null>(null);
  const [bundle, setBundle] = useState(0);

  /** Replace the current selection, then restore the caret after `text`. */
  const replaceSelection = (text: string, selectFrom = text.length, selectTo = text.length) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next.slice(0, maxLength));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + selectFrom, start + selectTo);
    });
  };

  /** Wrap the selection in `token` (or drop in `placeholder` when empty). */
  const wrap = (token: string, placeholder: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? 0;
    const end = el?.selectionEnd ?? 0;
    const selected = value.slice(start, end) || placeholder;
    replaceSelection(`${token}${selected}${token}`, token.length, token.length + selected.length);
  };

  /** Prefix every selected line (headings, bullets, quotes). */
  const prefixLines = (token: string, placeholder: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? 0;
    const end = el?.selectionEnd ?? 0;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const selected = value.slice(lineStart, end) || placeholder;
    const prefixed = selected
      .split("\n")
      .map((l) => (l.startsWith(token) ? l : token + l.replace(/^(#{1,6}\s|[*-]\s|>\s)/, "")))
      .join("\n");
    const next = value.slice(0, lineStart) + prefixed + value.slice(end);
    onChange(next.slice(0, maxLength));
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(lineStart + prefixed.length, lineStart + prefixed.length);
    });
  };

  /** Drop a whole block on its own lines below the caret. */
  const insertBlock = (block: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const before = value.slice(0, start);
    const lead = !before || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    replaceSelection(lead + block.trimEnd() + "\n");
    setMenu(null);
  };

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
          {/* toolbar */}
          <div className="relative flex flex-wrap items-center gap-0.5 border-b border-stone-100 bg-stone-50/40 px-2 py-1.5">
            <TB title="Section heading" text="H2" onClick={() => prefixLines("## ", "Section title")} />
            <TB title="Sub-heading" text="H3" onClick={() => prefixLines("### ", "Sub-section")} />
            <Divider />
            <TB title="Bold" icon="bold" onClick={() => wrap("**", "bold text")} />
            <TB title="Italic (notes, disclaimers)" icon="italic" onClick={() => wrap("*", "italic note")} />
            <Divider />
            <TB title="Bullet list" icon="ul" onClick={() => prefixLines("* ", "List item")} />
            <TB title="Numbered list" icon="ol" onClick={() => prefixLines("1. ", "List item")} />
            <TB title="Quote" icon="quote" onClick={() => prefixLines("> ", "Quoted note")} />
            <Divider />
            <TB
              title="Spec table"
              icon="grid"
              onClick={() =>
                insertBlock("| Attribute | Detail |\n| --- | --- |\n| **Label** | Value |\n| **Label** | Value |")
              }
            />
            <TB title="Divider" icon="minus" onClick={() => insertBlock("---")} />
            <TB
              title="Link"
              icon="link"
              onClick={() => {
                const url = window.prompt("Link URL", "https://");
                if (url) replaceSelection(`[link text](${url})`, 1, 10);
              }}
            />
            <Divider />

            {/* emoji picker */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setMenu(menu === "emoji" ? null : "emoji")}
              className={[
                "flex h-8 items-center gap-1 rounded-md px-2 text-[12.5px] font-semibold transition",
                menu === "emoji" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:bg-white hover:shadow-sm",
              ].join(" ")}
            >
              😀 Emoji <Icon name="chevronDown" size={13} />
            </button>

            {/* snippet picker */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setMenu(menu === "snippet" ? null : "snippet")}
              className={[
                "flex h-8 items-center gap-1 rounded-md px-2 text-[12.5px] font-semibold transition",
                menu === "snippet" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:bg-white hover:shadow-sm",
              ].join(" ")}
            >
              <Icon name="plus" size={14} /> Add section <Icon name="chevronDown" size={13} />
            </button>

            {menu === "emoji" && (
              <div className="absolute left-2 top-full z-20 mt-1 w-[290px] rounded-xl border border-stone-200 bg-white p-2 shadow-pop">
                <div className="flex items-center gap-1 border-b border-stone-100 pb-2">
                  {EMOJI_BUNDLES.map((b, i) => (
                    <button
                      key={b.label}
                      type="button"
                      title={b.label}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setBundle(i)}
                      className={[
                        "flex h-8 w-8 items-center justify-center rounded-md text-[16px] transition",
                        bundle === i ? "bg-stone-800/90 shadow-sm" : "hover:bg-stone-100",
                      ].join(" ")}
                    >
                      {b.tab}
                    </button>
                  ))}
                </div>
                <p className="px-1 pt-2 text-[11.5px] font-semibold uppercase tracking-wide text-stone-400">
                  {EMOJI_BUNDLES[bundle].label}
                </p>
                <div className="mt-1 grid grid-cols-5 gap-1">
                  {EMOJI_BUNDLES[bundle].emojis.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => replaceSelection(e + " ")}
                      className="flex h-9 items-center justify-center rounded-md text-[18px] transition hover:bg-stone-100"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {menu === "snippet" && (
              <div className="absolute left-2 top-full z-20 mt-1 w-[300px] overflow-hidden rounded-xl border border-stone-200 bg-white p-1.5 shadow-pop">
                {SNIPPETS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertBlock(s.md)}
                    className="flex w-full flex-col items-start rounded-lg px-2.5 py-2 text-left transition hover:bg-stone-50"
                  >
                    <span className="text-[13px] font-semibold text-stone-800">{s.label}</span>
                    <span className="text-[11.5px] text-stone-400">{s.hint}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertBlock(FULL_LAYOUT)}
                  className="mt-1 w-full rounded-lg border border-dashed border-stone-300 bg-stone-50/60 px-2.5 py-2 text-[12.5px] font-semibold text-stone-600 transition hover:border-brand-300 hover:text-brand-600"
                >
                  ✨ Insert the full layout
                </button>
              </div>
            )}
          </div>

          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onClick={() => setMenu(null)}
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
