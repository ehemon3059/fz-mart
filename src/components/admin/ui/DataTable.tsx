import type { ReactNode } from "react";
import { cn } from "./cn";

/* ── DataTable ─────────────────────────────────────────────────────────
   Thin wrapper around a real <table>, not a data grid. Provides the shared
   chrome: bordered card, sticky header on scroll, zebra-free row hover,
   consistent cell padding, and right-aligned numeric columns.

   Responsive collapse: keep the table for md+, render a card list for mobile.
   Pages pass a `mobile` renderer for the < md layout (see ProductMobileCard
   pattern) — this component doesn't force a single mobile shape. */

export function DataTable({
  head,
  children,
  className,
  maxHeight,
}: {
  head: ReactNode;
  children: ReactNode;
  className?: string;
  /** e.g. "24rem" to make the header sticky within a scroll region. */
  maxHeight?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-card",
        className,
      )}
      style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}
    >
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-stone-50 text-left text-[12px] font-semibold uppercase tracking-wide text-stone-500">
          {head}
        </thead>
        <tbody className="divide-y divide-stone-100">{children}</tbody>
      </table>
    </div>
  );
}

/** Header cell. `align="right"` for numeric columns. */
export function Th({
  children,
  align = "left",
  className,
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-4 py-2.5",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </th>
  );
}

/** Body cell. `numeric` right-aligns and applies tabular figures. */
export function Td({
  children,
  numeric = false,
  className,
  colSpan,
}: {
  children?: ReactNode;
  numeric?: boolean;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn("px-4 py-2.5 text-stone-700", numeric && "text-right nums", className)}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <tr className={cn("transition-colors hover:bg-stone-50", className)}>{children}</tr>;
}

/** Full-width empty row inside a table body. */
export function TableEmpty({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-stone-400">
        {children}
      </td>
    </tr>
  );
}
