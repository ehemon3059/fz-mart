import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";
import { Icon } from "@/components/icons";
import { cn } from "./cn";

/* ── Shared field chrome ───────────────────────────────────────────────
   One control surface (border, radius, focus ring) reused by every form
   input so the coupon form, product form, settings, etc. all match. */

const controlBase =
  "w-full rounded-md border bg-white px-3 py-2 text-sm text-stone-900 outline-none transition-colors " +
  "placeholder:text-stone-400 focus:border-accent focus:ring-2 focus:ring-accent/20 " +
  "disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400";

function control(error?: boolean) {
  return cn(controlBase, error ? "border-danger focus:border-danger focus:ring-danger/20" : "border-stone-300");
}

export function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[13px] font-semibold text-stone-700">
      {children}
      {required && <span className="ml-0.5 text-danger">*</span>}
    </label>
  );
}

function Helper({ error, hint, id }: { error?: string; hint?: ReactNode; id?: string }) {
  if (error) return <p id={id} className="mt-1 text-xs text-danger-fg">{error}</p>;
  if (hint) return <p id={id} className="mt-1 text-xs text-stone-500">{hint}</p>;
  return null;
}

interface WrapProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
}

/* ── Input ─────────────────────────────────────────────────────────── */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, WrapProps {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, required, className, id, ...rest },
  ref,
) {
  const auto = useId();
  const fieldId = id ?? auto;
  const descId = error || hint ? `${fieldId}-desc` : undefined;
  return (
    <div className={className}>
      {label && <FieldLabel htmlFor={fieldId} required={required}>{label}</FieldLabel>}
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={descId}
        className={control(!!error)}
        {...rest}
      />
      <Helper error={error} hint={hint} id={descId} />
    </div>
  );
});

/* ── Select (styled, keeps native <select> for accessibility) ───────── */
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, WrapProps {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, required, className, id, children, ...rest },
  ref,
) {
  const auto = useId();
  const fieldId = id ?? auto;
  const descId = error || hint ? `${fieldId}-desc` : undefined;
  return (
    <div className={className}>
      {label && <FieldLabel htmlFor={fieldId} required={required}>{label}</FieldLabel>}
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={descId}
          className={cn(control(!!error), "appearance-none pr-9")}
          {...rest}
        >
          {children}
        </select>
        <Icon
          name="chevronDown"
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
        />
      </div>
      <Helper error={error} hint={hint} id={descId} />
    </div>
  );
});

/* ── DatePicker (native date input, styled to match; accessible) ────── */
export const DatePicker = forwardRef<HTMLInputElement, InputProps>(function DatePicker(
  props,
  ref,
) {
  return <Input ref={ref} type="date" {...props} />;
});

/* ── Checkbox ──────────────────────────────────────────────────────── */
export function Checkbox({
  label,
  className,
  id,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <label htmlFor={fieldId} className={cn("flex cursor-pointer items-center gap-2 text-sm text-stone-700", className)}>
      <input
        id={fieldId}
        type="checkbox"
        className="h-4 w-4 rounded border-stone-300 text-accent accent-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
        {...rest}
      />
      {label}
    </label>
  );
}
