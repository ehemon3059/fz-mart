"use client";

/**
 * A select you can type into.
 *
 * The admin had no such control, so every long list was a bare `<select>` —
 * the purchase-order form and the coupon form both pour the entire catalogue
 * into one, which is unusable past a few dozen products and is why writing a
 * purchase order meant scrolling for a name you already knew.
 *
 * Deliberately filters IN MEMORY over a list the page already loaded, rather
 * than querying as you type: those pages fetch their options server-side
 * anyway, so this adds no request, no loading state and no debounce to get
 * wrong. If a catalogue ever outgrows that, this component keeps its shape and
 * only `options` changes where it comes from.
 *
 * Submits through a hidden input, so it drops into an existing `<form>` that
 * reads FormData exactly like the `<select>` it replaces.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";

export interface SearchOption {
  value: string;
  label: string;
  /** Second line — a SKU, a category path, whatever tells two alike names apart. */
  hint?: string;
}

interface Props {
  options: SearchOption[];
  value: string;
  onChange: (value: string) => void;
  /** Submitted as FormData under this name; omit for a controlled-only picker. */
  name?: string;
  placeholder?: string;
  /** Rendered as the last row of the list — e.g. "+ New product". */
  action?: { label: string; onSelect: () => void };
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export default function SearchSelect({
  options,
  value,
  onChange,
  name,
  placeholder = "Search…",
  action,
  disabled = false,
  required = false,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);

  // Match on the hint too: a SKU is often what someone reaches for, and it is
  // exactly what distinguishes two products with near-identical names.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.hint ?? "").toLowerCase().includes(q),
    );
  }, [options, query]);

  /** Rows the arrow keys can land on: the matches, plus the action if present. */
  const rowCount = matches.length + (action ? 1 : 0);

  useEffect(() => {
    setActive(0);
  }, [query, open]);

  // Close on an outside click. Pointerdown rather than click so the list is
  // gone before a click on something behind it lands.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const choose = (index: number) => {
    if (action && index === matches.length) {
      setOpen(false);
      setQuery("");
      action.onSelect();
      return;
    }
    const opt = matches[index];
    if (!opt) return;
    onChange(opt.value);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (rowCount === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + rowCount) % rowCount);
      return;
    }
    if (e.key === "Enter") {
      // Only swallow Enter while the list is open — otherwise it must reach the
      // form, or a picker would quietly block submitting.
      if (open) {
        e.preventDefault();
        choose(active);
      }
      return;
    }
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      setQuery("");
    }
  };

  const field =
    "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-accent disabled:bg-stone-50 disabled:text-stone-400";

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={value} required={required} />}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          // Showing the selected label as the value (not just a placeholder)
          // keeps the control readable when it is not focused.
          value={open ? query : (selected?.label ?? "")}
          placeholder={selected ? selected.label : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={`${field} pr-8`}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400">
          <Icon name="chevronDown" size={14} />
        </span>
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
        >
          {matches.length === 0 && !action && (
            <li className="px-3 py-2 text-[13px] text-stone-400">No matches.</li>
          )}

          {matches.map((o, i) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                // Mousedown, not click: the input's blur would otherwise close
                // the list before the click registered.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(i);
                }}
                onMouseEnter={() => setActive(i)}
                className={[
                  "flex w-full flex-col items-start px-3 py-1.5 text-left",
                  i === active ? "bg-stone-100" : "",
                  o.value === value ? "font-semibold text-accent" : "text-stone-700",
                ].join(" ")}
              >
                <span className="text-[13.5px] leading-snug">{o.label}</span>
                {o.hint && <span className="text-[11.5px] text-stone-400">{o.hint}</span>}
              </button>
            </li>
          ))}

          {action && (
            <li className="mt-1 border-t border-stone-100 pt-1">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(matches.length);
                }}
                onMouseEnter={() => setActive(matches.length)}
                className={[
                  "flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-[13px] font-semibold text-accent",
                  active === matches.length ? "bg-accent-soft" : "",
                ].join(" ")}
              >
                <Icon name="plus" size={13} />
                {action.label}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
