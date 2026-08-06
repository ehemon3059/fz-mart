"use client";

/**
 * Shared Markdown toolbar for the product form's two authoring surfaces: the
 * product Description and each "Features & Specs" accordion panel. Both write
 * the same Markdown through the same `renderMarkdown`, so they get the same
 * buttons — the differences are declared through props (accordion panels drop
 * H2, because the panel title is already that level).
 *
 * Every action is a plain text insert at the caret. Nothing here parses
 * Markdown or keeps state beyond which dropdown is open.
 */

import { useEffect, useRef, useState, type RefObject } from "react";
import { Icon, type IconName } from "@/components/icons";

export interface MarkdownSnippet {
  label: string;
  hint: string;
  md: string;
}

export interface EmojiBundle {
  label: string;
  tab: string;
  emojis: string[];
}

/** Default bundles — grouped by the section a product description is built
 *  from, so the picker doubles as a reminder of which icon belongs where. */
export const EMOJI_BUNDLES: EmojiBundle[] = [
  { tab: "💰", label: "Pricing & Offers", emojis: ["🏷️", "💳", "💵", "🎁", "⚡", "🛍️", "💥", "🔥", "🪙", "📉"] },
  { tab: "🚚", label: "Shipping & Delivery", emojis: ["📦", "🚚", "✈️", "📍", "⏳", "🏠", "🚛", "🗺️", "⏱️", "🔄"] },
  { tab: "⚙️", label: "Specs & Performance", emojis: ["🔋", "📱", "🔌", "💡", "⚡", "📐", "🖥️", "⚙️", "📶", "🎧"] },
  { tab: "🛡️", label: "Trust & Quality", emojis: ["✨", "🏅", "🔒", "🛡️", "👑", "✅", "⭐", "🤝", "🧾", "♻️"] },
  { tab: "📌", label: "Bullets & Pointers", emojis: ["🔹", "👉", "▪️", "📍", "✅", "💡", "➡️", "✔️", "❗", "⭕"] },
];

/* ─────────── caret helpers ─────────── */

export interface MarkdownActions {
  /** Replace the current selection, then restore the caret after `text`. */
  replaceSelection: (text: string, selectFrom?: number, selectTo?: number) => void;
  /** Wrap the selection in `token` (or drop in `placeholder` when empty). */
  wrap: (token: string, placeholder: string) => void;
  /** Prefix every selected line — headings, bullets, quotes. */
  prefixLines: (token: string, placeholder: string) => void;
  /** Drop a whole block on its own lines below the caret. */
  insertBlock: (block: string) => void;
}

/**
 * Caret-aware edits against a textarea's Markdown value. `value`/`onChange`
 * are the same pair the textarea is bound to, so the caller stays the single
 * source of truth — this only computes the next string.
 */
export function useMarkdownActions(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  onChange: (md: string) => void,
  maxLength = Infinity,
): MarkdownActions {
  const replaceSelection: MarkdownActions["replaceSelection"] = (text, selectFrom = text.length, selectTo = text.length) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    onChange((value.slice(0, start) + text + value.slice(end)).slice(0, maxLength));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + selectFrom, start + selectTo);
    });
  };

  const wrap: MarkdownActions["wrap"] = (token, placeholder) => {
    const el = ref.current;
    const start = el?.selectionStart ?? 0;
    const end = el?.selectionEnd ?? 0;
    const selected = value.slice(start, end) || placeholder;
    replaceSelection(`${token}${selected}${token}`, token.length, token.length + selected.length);
  };

  const prefixLines: MarkdownActions["prefixLines"] = (token, placeholder) => {
    const el = ref.current;
    const start = el?.selectionStart ?? 0;
    const end = el?.selectionEnd ?? 0;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const selected = value.slice(lineStart, end) || placeholder;
    const prefixed = selected
      .split("\n")
      .map((l) => (l.startsWith(token) ? l : token + l.replace(/^(#{1,6}\s|[*-]\s|>\s)/, "")))
      .join("\n");
    onChange((value.slice(0, lineStart) + prefixed + value.slice(end)).slice(0, maxLength));
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(lineStart + prefixed.length, lineStart + prefixed.length);
    });
  };

  const insertBlock: MarkdownActions["insertBlock"] = (block) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const before = value.slice(0, start);
    const lead = !before || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    replaceSelection(lead + block.trimEnd() + "\n");
  };

  return { replaceSelection, wrap, prefixLines, insertBlock };
}

/* ─────────── UI atoms ─────────── */

function TB({ title, onClick, icon, text }: { title: string; onClick: () => void; icon?: IconName; text?: string }) {
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

const SPEC_TABLE = "| Attribute | Detail |\n| --- | --- |\n| **Label** | Value |\n| **Label** | Value |";

interface Props {
  actions: MarkdownActions;
  /** H2 belongs to the top-level description only; accordion panels start at H3. */
  showH2?: boolean;
  /** Ready-made blocks for the insert menu. Omit to hide the menu entirely. */
  snippets?: MarkdownSnippet[];
  /** Label on the insert-menu button — "Add section" reads wrong where a
   *  "section" already means an accordion panel. */
  snippetLabel?: string;
  /** Optional "insert everything" row at the bottom of the snippet menu. */
  fullLayout?: { label: string; md: string };
  emojiBundles?: EmojiBundle[];
}

export default function MarkdownToolbar({
  actions,
  showH2 = true,
  snippets,
  snippetLabel = "Add section",
  fullLayout,
  emojiBundles = EMOJI_BUNDLES,
}: Props) {
  const [menu, setMenu] = useState<"emoji" | "snippet" | null>(null);
  const [bundle, setBundle] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const { replaceSelection, wrap, prefixLines, insertBlock } = actions;

  // Both dropdowns live inside the toolbar, so anything outside it — the
  // textarea the admin clicks back into, another card — dismisses them.
  useEffect(() => {
    if (!menu) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMenu(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menu]);

  const insert = (md: string) => {
    insertBlock(md);
    setMenu(null);
  };

  const menuButton = (kind: "emoji" | "snippet", body: React.ReactNode) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => setMenu(menu === kind ? null : kind)}
      className={[
        "flex h-8 items-center gap-1 rounded-md px-2 text-[12.5px] font-semibold transition",
        menu === kind ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:bg-white hover:shadow-sm",
      ].join(" ")}
    >
      {body}
    </button>
  );

  return (
    <div
      ref={rootRef}
      className="relative flex flex-wrap items-center gap-0.5 border-b border-stone-100 bg-stone-50/40 px-2 py-1.5"
    >
      {showH2 && <TB title="Section heading" text="H2" onClick={() => prefixLines("## ", "Section title")} />}
      <TB title="Sub-heading" text="H3" onClick={() => prefixLines("### ", "Sub-section")} />
      <Divider />
      <TB title="Bold" icon="bold" onClick={() => wrap("**", "bold text")} />
      <TB title="Italic (notes, disclaimers)" icon="italic" onClick={() => wrap("*", "italic note")} />
      <Divider />
      <TB title="Bullet list" icon="ul" onClick={() => prefixLines("* ", "List item")} />
      <TB title="Numbered list" icon="ol" onClick={() => prefixLines("1. ", "List item")} />
      <TB title="Quote" icon="quote" onClick={() => prefixLines("> ", "Quoted note")} />
      <Divider />
      <TB title="Spec table" icon="grid" onClick={() => insertBlock(SPEC_TABLE)} />
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

      {menuButton(
        "emoji",
        <>
          😀 Emoji <Icon name="chevronDown" size={13} />
        </>,
      )}

      {snippets &&
        snippets.length > 0 &&
        menuButton(
          "snippet",
          <>
            <Icon name="plus" size={14} /> {snippetLabel} <Icon name="chevronDown" size={13} />
          </>,
        )}

      {menu === "emoji" && (
        <div className="absolute left-2 top-full z-20 mt-1 w-[290px] rounded-xl border border-stone-200 bg-white p-2 shadow-pop">
          <div className="flex items-center gap-1 border-b border-stone-100 pb-2">
            {emojiBundles.map((b, i) => (
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
            {emojiBundles[bundle]?.label}
          </p>
          <div className="mt-1 grid grid-cols-5 gap-1">
            {(emojiBundles[bundle]?.emojis ?? []).map((e) => (
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

      {menu === "snippet" && snippets && (
        <div className="absolute left-2 top-full z-20 mt-1 max-h-[340px] w-[300px] overflow-y-auto rounded-xl border border-stone-200 bg-white p-1.5 shadow-pop">
          {snippets.map((s) => (
            <button
              key={s.label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert(s.md)}
              className="flex w-full flex-col items-start rounded-lg px-2.5 py-2 text-left transition hover:bg-stone-50"
            >
              <span className="text-[13px] font-semibold text-stone-800">{s.label}</span>
              <span className="text-[11.5px] text-stone-400">{s.hint}</span>
            </button>
          ))}
          {fullLayout && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert(fullLayout.md)}
              className="mt-1 w-full rounded-lg border border-dashed border-stone-300 bg-stone-50/60 px-2.5 py-2 text-[12.5px] font-semibold text-stone-600 transition hover:border-brand-300 hover:text-brand-600"
            >
              {fullLayout.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
