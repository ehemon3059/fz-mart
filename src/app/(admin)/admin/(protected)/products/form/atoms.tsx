"use client";

/**
 * The product form's UI primitives — the card shell every section sits in, and
 * the label / field / error / toggle set its inputs are built from. Presentation
 * only: none of these hold state or know what a product is.
 */

import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

export function Card({
  icon,
  title,
  hint,
  children,
  className = "",
}: {
  icon?: IconName;
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"overflow-hidden rounded-xl border border-stone-200 bg-white shadow-soft " + className}>
      <header className="flex items-center gap-2.5 border-b border-stone-100 px-5 py-3.5">
        {icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
            <Icon name={icon} size={15} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-[14.5px] font-bold tracking-tight text-stone-800">{title}</h2>
          {hint && <p className="text-[12.5px] text-stone-400">{hint}</p>}
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Label({ children, required, hint }: { children: ReactNode; required?: boolean; hint?: string }) {
  return (
    <label className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-semibold text-stone-700">
      <span>{children}</span>
      {required && <span className="text-red-500">*</span>}
      {hint && <span className="ml-auto text-[12px] font-normal text-stone-400">{hint}</span>}
    </label>
  );
}

export function FieldShell({ error, prefix, children }: { error?: string; prefix?: ReactNode; children: ReactNode }) {
  return (
    <div
      className={[
        "flex items-center overflow-hidden rounded-lg border bg-white transition focus-within:ring-4",
        error
          ? "border-red-300 focus-within:border-red-500 focus-within:ring-red-50"
          : "border-stone-200 focus-within:border-brand-500 focus-within:ring-brand-50",
      ].join(" ")}
    >
      {prefix && (
        <span className="border-r border-stone-200 bg-stone-50 px-3 py-2.5 text-[14px] font-semibold text-stone-500">
          {prefix}
        </span>
      )}
      {children}
    </div>
  );
}

export function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] text-red-600">
      <Icon name="warn" size={13} className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  sublabel,
  icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sublabel?: string;
  icon?: IconName;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon && (
        <span
          className={[
            "flex h-9 w-9 items-center justify-center rounded-lg",
            checked ? "bg-brand-50 text-brand-600" : "bg-stone-100 text-stone-400",
          ].join(" ")}
        >
          <Icon name={icon} size={16} />
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-semibold text-stone-800">{label}</p>
        {sublabel && <p className="text-[12px] text-stone-400">{sublabel}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={["relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-brand-600" : "bg-stone-300"].join(" ")}
      >
        <span
          className={["absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", checked ? "left-[22px]" : "left-0.5"].join(
            " ",
          )}
        />
      </button>
    </div>
  );
}
