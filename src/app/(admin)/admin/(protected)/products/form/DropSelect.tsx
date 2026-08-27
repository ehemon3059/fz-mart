"use client";

/**
 * A select whose list always opens DOWNWARD.
 *
 * A native `<select>` picks its own direction: with 4 categories Chrome drops
 * the list below the field, with 11 it decides the list will not fit and flips
 * it above — so "Single item" and "Colours" behaved differently on the same
 * form. Nothing in CSS reaches that popup, so the only way to fix the direction
 * is to stop using it and draw the list ourselves.
 *
 * The panel is PORTALLED to <body> and positioned `fixed`. That matters: this
 * picker lives inside `Card`, which sets `overflow-hidden` (atoms.tsx), and an
 * absolutely-positioned panel inside it gets clipped at the card's edge — which
 * is exactly how the first attempt at this component rendered wrong. A portal
 * has no such ancestor, so nothing can crop it.
 *
 * Deliberately plain: no filtering, no search box. These lists are short, and
 * `SearchSelect` already covers the long ones.
 */

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons";

export interface DropOption {
  value: string;
  label: string;
  /** Nesting level — rendered as real indentation. */
  depth?: number;
}

/** Room to leave between the panel and the window edge. */
const MARGIN = 8;

export default function DropSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  error = false,
  disabled = false,
  className = "",
}: {
  options: DropOption[];
  value: string;
  onChange: (next: string) => void;
  /** Shown when nothing is chosen, and offered as the first, empty row. */
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState<{ left: number; top: number; width: number; maxH: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  // Portals need a DOM that exists; on the server it does not.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /** The empty row first, so clearing the choice stays possible. */
  const rows = useMemo<DropOption[]>(
    () => [{ value: "", label: placeholder }, ...options],
    [options, placeholder],
  );

  const selected = options.find((o) => o.value === value) ?? null;

  /**
   * Pin the panel under the trigger in viewport coordinates. Always below —
   * that is the whole point — but capped so a long list scrolls internally
   * instead of running off the bottom of the window.
   */
  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const top = r.bottom + 4;
    setRect({
      left: r.left,
      top,
      width: r.width,
      maxH: Math.max(120, window.innerHeight - top - MARGIN),
    });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  // Follow the trigger while the page moves under it. Capture phase so scrolls
  // inside any nested scroller count, not just the window's.
  useEffect(() => {
    if (!open) return;
    const onMove = () => place();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, place]);

  // Open onto the current choice rather than the top of the list.
  useEffect(() => {
    if (open) setActive(Math.max(0, rows.findIndex((r) => r.value === value)));
  }, [open, rows, value]);

  // Close on an outside press. Pointerdown, not click, so the list is gone
  // before a press on something behind it lands. The panel is portalled, so it
  // is not inside the trigger's subtree — both must be checked.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const choose = (index: number) => {
    const row = rows[index];
    if (!row) return;
    onChange(row.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + rows.length) % rows.length);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open) choose(active);
      else setOpen(true);
      return;
    }
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  const triggerClass = [
    "flex w-full items-center rounded-lg border bg-white px-3 py-2.5 pr-9 text-left text-[14px] outline-none transition focus:ring-4",
    error
      ? "border-red-300 focus:border-red-500 focus:ring-red-50"
      : "border-stone-200 focus:border-brand-500 focus:ring-brand-50",
    disabled ? "cursor-not-allowed bg-stone-50 text-stone-400" : "text-stone-800",
  ].join(" ");

  const panel =
    open && rect ? (
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        style={{
          position: "fixed",
          left: rect.left,
          top: rect.top,
          width: rect.width,
          maxHeight: rect.maxH,
          zIndex: 9999,
        }}
        className="overflow-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
      >
        {rows.map((o, i) => (
          <li key={o.value || "__empty"}>
            <button
              type="button"
              role="option"
              aria-selected={o.value === value}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(i);
              }}
              onMouseEnter={() => setActive(i)}
              className={[
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13.5px] leading-snug",
                i === active ? "bg-stone-100" : "",
                !o.value
                  ? "text-stone-400"
                  : o.value === value
                    ? "font-semibold text-brand-600"
                    : "text-stone-700",
              ].join(" ")}
              style={o.depth ? { paddingLeft: 12 + o.depth * 14 } : undefined}
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && o.value !== "" && (
                <span className="ml-auto shrink-0 text-brand-600">
                  <Icon name="check" size={13} />
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={triggerClass}
      >
        <span className={`truncate ${selected ? "" : "text-stone-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
      </button>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
        <Icon name="chevronDown" size={16} />
      </span>

      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
