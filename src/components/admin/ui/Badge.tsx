import { cn } from "./cn";

export type BadgeTone = "success" | "warning" | "danger" | "neutral" | "accent";

const TONES: Record<BadgeTone, string> = {
  success: "bg-success-soft text-success-fg",
  warning: "bg-warning-soft text-warning-fg",
  danger: "bg-danger-soft text-danger-fg",
  neutral: "bg-stone-100 text-stone-600",
  accent: "bg-accent-soft text-accent-hover",
};

/** Status pill driven by semantic tone. One shape (rounded-full), one type
 *  scale — used for order status, active/inactive, stock, etc. */
export function Badge({
  tone = "neutral",
  children,
  className,
  dot = false,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}
