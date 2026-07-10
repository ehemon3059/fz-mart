import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover shadow-sm disabled:bg-accent/60",
  secondary:
    "bg-white text-stone-700 border border-stone-300 hover:bg-stone-50 disabled:opacity-60",
  ghost:
    "bg-transparent text-stone-600 hover:bg-stone-100 disabled:opacity-60",
  danger:
    "bg-danger text-white hover:bg-danger-fg shadow-sm disabled:bg-danger/60",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[13px] gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
};

const base =
  "inline-flex items-center justify-center rounded-md font-semibold transition-colors " +
  "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-white disabled:cursor-not-allowed select-none";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  loading?: boolean;
  className?: string;
}

export interface ButtonProps
  extends CommonProps,
    ButtonHTMLAttributes<HTMLButtonElement> {}

/** Primary shared button. Handles loading (spinner + disabled) and optional
 *  leading icon. Use `variant` for intent, never ad-hoc bg classes. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", icon, loading, children, className, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(base, VARIANTS[variant], SIZES[size], className)}
      {...rest}
    >
      {loading ? (
        <Spinner />
      ) : icon ? (
        <Icon name={icon} size={size === "sm" ? 15 : 17} />
      ) : null}
      {children}
    </button>
  );
});

/** Link styled as a button — same visual language for navigation actions. */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  icon,
  children,
  className,
}: CommonProps & { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn(base, VARIANTS[variant], SIZES[size], className)}>
      {icon && <Icon name={icon} size={size === "sm" ? 15 : 17} />}
      {children}
    </Link>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
