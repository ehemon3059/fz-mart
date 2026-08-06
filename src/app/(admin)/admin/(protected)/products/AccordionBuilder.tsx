"use client";

/**
 * Accordion Builder — the collapsible "Features & Specs" panels shown on the
 * product page.
 *
 * Layout mirrors the rest of the product form rather than a standalone admin
 * app: a section list on the left (select / reorder / delete), the editor for
 * the selected section on the right, and a live accordion preview underneath
 * that renders exactly what the storefront will show.
 *
 * Content is Markdown, rendered through the same `renderMarkdown` used by the
 * storefront, so tables/bullets/emoji look identical in preview and production.
 * State lives here and is lifted to ProductForm, which serialises it into the
 * hidden `accordionSections` input — one Save persists the whole set, and array
 * order IS display order (the server assigns sortOrder positionally).
 */

import { useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { renderMarkdown } from "@/lib/markdown";

export interface AccordionSectionRow {
  title: string;
  /** Leading emoji shown before the title; "" = none. */
  icon: string;
  /** Markdown body. */
  content: string;
  /** Whether the panel starts expanded on the storefront. */
  isOpen: boolean;
}

interface Props {
  value: AccordionSectionRow[];
  onChange: (rows: AccordionSectionRow[]) => void;
}

/* ─────────── ready-made sections ─────────── */
/** Starting points that match how these accordions are usually written. The
 *  four defaults mirror a typical gear/apparel product page. */
const PRESETS: { label: string; hint: string; row: AccordionSectionRow }[] = [
  {
    label: "🔎 Know Your Gear",
    hint: "Story + hook",
    row: {
      title: "Know Your Gear",
      icon: "🔎",
      isOpen: true,
      content: `**Product name here** — the one-line hook that sells it.

Who it is for, the problem it solves, and what makes it different. Keep this to a short paragraph, then let the bullets do the work.

- ✅ Headline benefit — what the buyer actually gets
- ✅ Second benefit — why it beats the alternative
- ✅ Third benefit — the detail people ask about`,
    },
  },
  {
    label: "⭐ Key Highlights",
    hint: "Benefit bullets",
    row: {
      title: "Key Highlights",
      icon: "⭐",
      isOpen: false,
      content: `- **Highlight** — what it means for the buyer
- **Highlight** — the benefit, not just the spec
- **Highlight** — compatibility or coverage
- **Highlight** — build, safety or care detail`,
    },
  },
  {
    label: "⚙️ Technical Specifications",
    hint: "Spec table",
    row: {
      title: "Technical Specifications",
      icon: "⚙️",
      isOpen: false,
      content: `| Attribute | Detail |
| --- | --- |
| **Material** | value |
| **Dimensions** | value |
| **Weight** | value |
| **Colour** | value |
| **Care** | value |`,
    },
  },
  {
    label: "🏭 Manufacturing Details",
    hint: "SKU, origin, contact",
    row: {
      title: "Manufacturing Details",
      icon: "🏭",
      isOpen: false,
      content: `| Field | Detail |
| --- | --- |
| **SKU** | value |
| **Marketed By** | value |
| **Country Of Origin** | value |
| **For Complaints** | phone · email |`,
    },
  },
  {
    label: "👕 Product Details",
    hint: "Attribute table (fabric)",
    row: {
      title: "Product Details",
      icon: "👕",
      isOpen: true,
      content: `| Attribute | Detail |
| --- | --- |
| **Colour** | value |
| **Fabric Content** | value |
| **Neck Type** | value |
| **Sleeve** | value |
| **Pattern** | value |
| **Care** | value |`,
    },
  },
  {
    label: "💡 Styling Suggestion",
    hint: "How to wear it",
    row: {
      title: "Styling Suggestion",
      icon: "💡",
      isOpen: false,
      content: `Pair it with — the obvious combination, then a dressier one. Mention footwear and one accessory, and the occasions it suits.`,
    },
  },
];

/* ─────────── emoji picker ─────────── */
/** Grouped so the picker doubles as a hint of which icon suits which section. */
const EMOJI_GROUPS: { tab: string; label: string; emojis: string[] }[] = [
  { tab: "🔎", label: "Overview & Story", emojis: ["🔎", "🛍️", "📖", "✨", "🎯", "💫", "🧭", "🏷️", "📝", "🙌"] },
  { tab: "⚙️", label: "Specs & Tech", emojis: ["⚙️", "🔧", "🔩", "📐", "🔋", "🔌", "📶", "💻", "🖥️", "🧮"] },
  { tab: "⭐", label: "Highlights", emojis: ["⭐", "🌟", "🔥", "💥", "🏅", "👑", "✅", "☑️", "❇️", "🎖️"] },
  { tab: "👕", label: "Apparel & Fabric", emojis: ["👕", "👗", "🧵", "🧶", "🪡", "👖", "🧥", "🥻", "👔", "🧺"] },
  { tab: "🏭", label: "Making & Origin", emojis: ["🏭", "🏗️", "🌍", "📍", "🧾", "📦", "🔖", "🗂️", "⚗️", "🛠️"] },
  { tab: "🛡️", label: "Care & Trust", emojis: ["🛡️", "🔒", "♻️", "🧼", "💧", "☀️", "🚿", "🤝", "🧴", "⚠️"] },
  { tab: "💡", label: "Tips & Styling", emojis: ["💡", "👉", "📌", "🎨", "💃", "🕺", "👟", "👜", "💍", "🕶️"] },
];

/* ─────────── markdown toolbar atoms ─────────── */
function TB({ title, onClick, text }: { title: string; onClick: () => void; text: string }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()} // keep the textarea selection
      onClick={onClick}
      className="flex h-7 min-w-[1.9rem] items-center justify-center rounded-md px-1.5 text-[12.5px] font-bold text-stone-600 transition hover:bg-white hover:text-stone-900 hover:shadow-sm"
    >
      {text}
    </button>
  );
}

const Divider = () => <span className="mx-0.5 h-4 w-px bg-stone-200" />;

const blankRow = (): AccordionSectionRow => ({ title: "", icon: "", content: "", isOpen: false });

export default function AccordionBuilder({ value, onChange }: Props) {
  // Index of the section being edited. Kept rather than an id because rows are
  // positional (order = display order) and never persist a client-side id.
  const [selected, setSelected] = useState<number | null>(value.length ? 0 : null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [group, setGroup] = useState(0);
  // Which preview panels the admin has toggled open, so the preview behaves
  // like the real accordion instead of following isOpen only.
  const [previewOpen, setPreviewOpen] = useState<Record<number, boolean>>({});
  const ref = useRef<HTMLTextAreaElement>(null);

  const current = selected != null ? value[selected] : null;

  const setRow = (idx: number, patch: Partial<AccordionSectionRow>) =>
    onChange(value.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const addRow = (row: AccordionSectionRow) => {
    onChange([...value, row]);
    setSelected(value.length);
    setTab("write");
    setPresetOpen(false);
  };

  const removeRow = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
    setSelected((prev) => {
      if (prev == null) return null;
      if (prev === idx) return null;
      return prev > idx ? prev - 1 : prev;
    });
  };

  /** Swap a row with its neighbour; the selection follows the moved row. */
  const move = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= value.length) return;
    const rows = [...value];
    [rows[idx], rows[next]] = [rows[next], rows[idx]];
    onChange(rows);
    setSelected((prev) => (prev === idx ? next : prev === next ? idx : prev));
  };

  /* ── markdown insert helpers (operate on the selected row's content) ── */
  const replaceSelection = (text: string, selFrom = text.length, selTo = text.length) => {
    if (selected == null) return;
    const el = ref.current;
    const content = value[selected].content;
    const start = el?.selectionStart ?? content.length;
    const end = el?.selectionEnd ?? content.length;
    setRow(selected, { content: content.slice(0, start) + text + content.slice(end) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + selFrom, start + selTo);
    });
  };

  const wrap = (token: string, placeholder: string) => {
    if (selected == null) return;
    const el = ref.current;
    const content = value[selected].content;
    const start = el?.selectionStart ?? 0;
    const end = el?.selectionEnd ?? 0;
    const sel = content.slice(start, end) || placeholder;
    replaceSelection(`${token}${sel}${token}`, token.length, token.length + sel.length);
  };

  const prefixLines = (token: string, placeholder: string) => {
    if (selected == null) return;
    const el = ref.current;
    const content = value[selected].content;
    const start = el?.selectionStart ?? 0;
    const end = el?.selectionEnd ?? 0;
    const lineStart = content.lastIndexOf("\n", start - 1) + 1;
    const sel = content.slice(lineStart, end) || placeholder;
    const prefixed = sel
      .split("\n")
      .map((l) => (l.startsWith(token) ? l : token + l.replace(/^(#{1,6}\s|[*-]\s|>\s)/, "")))
      .join("\n");
    setRow(selected, { content: content.slice(0, lineStart) + prefixed + content.slice(end) });
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(lineStart + prefixed.length, lineStart + prefixed.length);
    });
  };

  const insertBlock = (block: string) => {
    if (selected == null) return;
    const el = ref.current;
    const content = value[selected].content;
    const start = el?.selectionStart ?? content.length;
    const before = content.slice(0, start);
    const lead = !before || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    replaceSelection(lead + block.trimEnd() + "\n");
  };

  return (
    // On a wide canvas the list and the editor sit side by side (the layout
    // this builder was designed around); below 2xl the form's left column is
    // too narrow to split, so the grid collapses to the stacked order.
    <div className="grid gap-4 2xl:grid-cols-[320px_minmax(0,1fr)] 2xl:items-start">
      {/* ── section list ── */}
      <div className="min-w-0 2xl:sticky 2xl:top-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-stone-400">
            Sections{value.length > 0 && ` · ${value.length}`}
          </span>
          {value.length > 0 && (
            <span className="text-[11.5px] text-stone-400">Order here = order on the product page</span>
          )}
        </div>

        {value.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/60 px-4 py-6 text-center">
            <p className="text-[13px] font-semibold text-stone-600">No accordion sections yet</p>
            <p className="mx-auto mt-1 max-w-sm text-[12px] text-stone-400">
              Add sections to replace the plain description with collapsible panels under{" "}
              <strong className="font-semibold text-stone-500">Features &amp; Specs</strong>. Leave this empty to keep
              showing the description.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {value.map((row, idx) => {
              const on = selected === idx;
              return (
                <div
                  key={idx}
                  className={[
                    "flex items-center gap-2 rounded-lg border px-2 py-1.5 transition",
                    on ? "border-brand-500 bg-brand-50/40 shadow-sm" : "border-stone-200 bg-stone-50/60 hover:bg-stone-50",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(on ? null : idx);
                      setTab("write");
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="w-6 shrink-0 text-center text-[15px]">{row.icon || "▫️"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-stone-800">
                        {row.title.trim() || <span className="text-stone-400">Untitled section</span>}
                      </span>
                      <span className="block truncate text-[11.5px] text-stone-400">
                        {row.content.trim()
                          ? row.content.trim().replace(/[#*|>-]/g, " ").replace(/\s+/g, " ").slice(0, 60)
                          : "No content yet"}
                      </span>
                    </span>
                    {row.isOpen && (
                      <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-600">
                        open
                      </span>
                    )}
                  </button>

                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0}
                      aria-label="Move up"
                      className="flex h-7 w-6 items-center justify-center rounded-md text-stone-400 transition hover:bg-white hover:text-stone-700 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <Icon name="chevronDown" size={14} className="rotate-180" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(idx, 1)}
                      disabled={idx === value.length - 1}
                      aria-label="Move down"
                      className="flex h-7 w-6 items-center justify-center rounded-md text-stone-400 transition hover:bg-white hover:text-stone-700 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <Icon name="chevronDown" size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      aria-label="Delete section"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-stone-400 transition hover:bg-red-50 hover:text-red-500"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* add buttons */}
        <div className="relative mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => addRow(blankRow())}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-300 bg-stone-50/60 py-2 text-[13px] font-semibold text-stone-500 transition hover:border-brand-300 hover:bg-brand-50/30 hover:text-brand-600"
          >
            <Icon name="plus" size={15} /> Blank section
          </button>
          <button
            type="button"
            onClick={() => setPresetOpen((o) => !o)}
            className={[
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-[13px] font-semibold transition",
              presetOpen
                ? "border-brand-400 bg-brand-50/40 text-brand-600"
                : "border-stone-300 bg-stone-50/60 text-stone-500 hover:border-brand-300 hover:bg-brand-50/30 hover:text-brand-600",
            ].join(" ")}
          >
            ✨ Ready-made <Icon name="chevronDown" size={13} />
          </button>

          {presetOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-[300px] overflow-hidden rounded-xl border border-stone-200 bg-white p-1.5 shadow-pop">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => addRow({ ...p.row })}
                  className="flex w-full flex-col items-start rounded-lg px-2.5 py-2 text-left transition hover:bg-stone-50"
                >
                  <span className="text-[13px] font-semibold text-stone-800">{p.label}</span>
                  <span className="text-[11.5px] text-stone-400">{p.hint}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  // The four-section layout from the reference build.
                  onChange([...value, ...PRESETS.slice(0, 4).map((p) => ({ ...p.row }))]);
                  setSelected(value.length);
                  setPresetOpen(false);
                }}
                className="mt-1 w-full rounded-lg border border-dashed border-stone-300 bg-stone-50/60 px-2.5 py-2 text-[12.5px] font-semibold text-stone-600 transition hover:border-brand-300 hover:text-brand-600"
              >
                ✨ Insert all four sections
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── editor for the selected section ── */}
      {current && selected != null && (
        <div className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white">
          <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/70 px-3 py-2">
            <span className="text-[12.5px] font-semibold text-stone-700">
              Editing section {selected + 1} of {value.length}
            </span>
            <div className="flex items-center gap-1">
              {(["write", "preview"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={[
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold capitalize transition",
                    tab === t ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800",
                  ].join(" ")}
                >
                  <Icon name={t === "write" ? "pencil" : "eye"} size={13} /> {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 p-3.5">
            {/* title + icon + default state */}
            <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto]">
              <div className="relative">
                <label className="mb-1 block text-[12px] font-semibold text-stone-600">Icon</label>
                <button
                  type="button"
                  onClick={() => setEmojiOpen((o) => !o)}
                  title="Pick an emoji"
                  className="flex h-9 w-[4.5rem] items-center justify-center gap-1 rounded-md border border-stone-200 bg-white text-[17px] transition hover:border-brand-300"
                >
                  {current.icon || <span className="text-[12px] text-stone-400">none</span>}
                  <Icon name="chevronDown" size={12} className="text-stone-400" />
                </button>

                {emojiOpen && (
                  <div className="absolute left-0 top-full z-20 mt-1 w-[280px] rounded-xl border border-stone-200 bg-white p-2 shadow-pop">
                    <div className="flex items-center gap-1 overflow-x-auto border-b border-stone-100 pb-2">
                      {EMOJI_GROUPS.map((g, i) => (
                        <button
                          key={g.label}
                          type="button"
                          title={g.label}
                          onClick={() => setGroup(i)}
                          className={[
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[15px] transition",
                            group === i ? "bg-stone-800/90 shadow-sm" : "hover:bg-stone-100",
                          ].join(" ")}
                        >
                          {g.tab}
                        </button>
                      ))}
                    </div>
                    <p className="px-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                      {EMOJI_GROUPS[group].label}
                    </p>
                    <div className="mt-1 grid grid-cols-5 gap-1">
                      {EMOJI_GROUPS[group].emojis.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => {
                            setRow(selected, { icon: e });
                            setEmojiOpen(false);
                          }}
                          className="flex h-8 items-center justify-center rounded-md text-[17px] transition hover:bg-stone-100"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRow(selected, { icon: "" });
                        setEmojiOpen(false);
                      }}
                      className="mt-1.5 w-full rounded-md border border-stone-200 py-1 text-[11.5px] font-semibold text-stone-500 transition hover:bg-stone-50"
                    >
                      No icon
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-semibold text-stone-600">Section title</label>
                <input
                  value={current.title}
                  onChange={(e) => setRow(selected, { title: e.target.value })}
                  placeholder="e.g. Technical Specifications"
                  className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-2 text-[13.5px] text-stone-800 outline-none focus:border-brand-500 placeholder:text-stone-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-semibold text-stone-600">Default state</label>
                <select
                  value={current.isOpen ? "open" : "closed"}
                  onChange={(e) => setRow(selected, { isOpen: e.target.value === "open" })}
                  className="h-9 rounded-md border border-stone-200 bg-white px-2 text-[13px] text-stone-800 outline-none focus:border-brand-500"
                >
                  <option value="closed">Closed</option>
                  <option value="open">Open</option>
                </select>
              </div>
            </div>

            {/* content */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-stone-600">Content (Markdown)</label>
              {tab === "write" ? (
                <div className="overflow-hidden rounded-lg border border-stone-200">
                  <div className="flex flex-wrap items-center gap-0.5 border-b border-stone-100 bg-stone-50/60 px-1.5 py-1">
                    <TB title="Sub-heading" text="H3" onClick={() => prefixLines("### ", "Sub-section")} />
                    <Divider />
                    <TB title="Bold" text="B" onClick={() => wrap("**", "bold text")} />
                    <TB title="Italic" text="I" onClick={() => wrap("*", "italic note")} />
                    <Divider />
                    <TB title="Bullet list" text="• list" onClick={() => prefixLines("- ", "List item")} />
                    <TB title="Numbered list" text="1. list" onClick={() => prefixLines("1. ", "List item")} />
                    <Divider />
                    <TB
                      title="Attribute table"
                      text="⎔ table"
                      onClick={() =>
                        insertBlock("| Attribute | Detail |\n| --- | --- |\n| **Label** | Value |\n| **Label** | Value |")
                      }
                    />
                  </div>
                  <textarea
                    ref={ref}
                    value={current.content}
                    onChange={(e) => setRow(selected, { content: e.target.value })}
                    rows={10}
                    spellCheck
                    placeholder={
                      "Write this section in Markdown.\n\n| Attribute | Detail |\n| --- | --- |\n| **Material** | 100% cotton |\n\n- **Highlight** — why it matters"
                    }
                    className="block max-h-[70vh] min-h-[260px] w-full resize-y bg-white px-3 py-2.5 font-spline-mono text-[12.5px] leading-[1.7] text-stone-800 outline-none placeholder:text-stone-300 2xl:min-h-[460px]"
                  />
                </div>
              ) : (
                <div className="min-h-[260px] rounded-lg border border-stone-200 bg-white px-3.5 py-3 2xl:min-h-[460px]">
                  {current.content.trim() ? (
                    <div
                      className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-stone-900 prose-h3:mb-1.5 prose-h3:mt-4 prose-h3:text-[14.5px] prose-p:text-stone-700 prose-strong:text-stone-900 prose-li:my-0.5 prose-li:text-stone-700 prose-table:text-[13px] prose-th:text-left"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(current.content) }}
                    />
                  ) : (
                    <p className="py-10 text-center text-[13px] text-stone-400">Nothing to preview yet.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Side-by-side only: keeps the editor column from collapsing to nothing
          while no section is selected. Stacked layouts just omit it. */}
      {!current && (
        <div className="hidden min-h-[300px] items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/40 px-6 text-center 2xl:flex">
          <p className="text-[13px] text-stone-400">
            {value.length === 0
              ? "Add a section on the left — it opens here for editing."
              : "Pick a section on the left to edit it here."}
          </p>
        </div>
      )}

      {/* ── live accordion preview ── */}
      {value.length > 0 && (
        <div className="min-w-0 2xl:col-span-2">
          <div className="mb-2 flex items-center gap-1.5">
            <Icon name="eye" size={14} className="text-stone-400" />
            <span className="text-[12px] font-semibold uppercase tracking-wide text-stone-400">
              Live preview — as shown under Features &amp; Specs
            </span>
          </div>
          <div className="space-y-1.5 rounded-xl border border-stone-200 bg-stone-50/40 p-2.5">
            {value.map((row, idx) => {
              // isOpen is the first-paint default; a click here overrides it so
              // the admin can inspect any panel without changing the setting.
              const open = previewOpen[idx] ?? row.isOpen;
              return (
                <div key={idx} className="overflow-hidden rounded-lg border border-stone-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setPreviewOpen((p) => ({ ...p, [idx]: !open }))}
                    className="flex w-full items-center justify-between gap-2 bg-stone-50/70 px-3 py-2.5 text-left transition hover:bg-stone-100/70"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-[13.5px] font-semibold text-stone-800">
                      {row.icon && <span className="text-[15px]">{row.icon}</span>}
                      <span className="truncate">{row.title.trim() || "Untitled section"}</span>
                    </span>
                    <Icon
                      name="chevronDown"
                      size={15}
                      className={`shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open && (
                    <div className="border-t border-stone-100 px-3.5 py-3">
                      {row.content.trim() ? (
                        <div
                          className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-stone-900 prose-h3:mb-1.5 prose-h3:mt-3 prose-h3:text-[14px] prose-p:text-stone-700 prose-strong:text-stone-900 prose-li:my-0.5 prose-li:text-stone-700 prose-table:text-[12.5px] prose-th:text-left"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(row.content) }}
                        />
                      ) : (
                        <p className="text-[12.5px] italic text-stone-400">No content yet.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11.5px] text-stone-400">
            Sections with a blank title or empty content are skipped when saving.
          </p>
        </div>
      )}
    </div>
  );
}
