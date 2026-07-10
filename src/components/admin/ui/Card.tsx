import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { cn } from "./cn";

/** Default surface card. One radius (lg), one border, one shadow — the quiet
 *  container everything secondary sits in. */
export function Card({
  children,
  className,
  as: As = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section";
}) {
  return (
    <As className={cn("rounded-lg border border-stone-200 bg-white shadow-card", className)}>
      {children}
    </As>
  );
}

/** KPI card — the *primary* metric treatment. Reads differently from a plain
 *  Card: accent hairline, larger figure, optional trend/href. Use for the top
 *  dashboard row only, so headline numbers stand apart from breakdowns. */
export function KpiCard({
  label,
  value,
  sub,
  icon,
  href,
  tone = "accent",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: IconName;
  href?: string;
  tone?: "accent" | "warning" | "neutral";
}) {
  const accentBar =
    tone === "warning" ? "bg-warning" : tone === "neutral" ? "bg-stone-300" : "bg-accent";
  const iconWrap =
    tone === "warning"
      ? "bg-warning-soft text-warning-fg"
      : tone === "neutral"
        ? "bg-stone-100 text-stone-500"
        : "bg-accent-soft text-accent-hover";

  const inner = (
    <div className="relative overflow-hidden rounded-lg border border-stone-200 bg-white p-5 shadow-card">
      <span className={cn("absolute inset-y-0 left-0 w-1", accentBar)} aria-hidden="true" />
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium uppercase tracking-wide text-stone-500">{label}</p>
        {icon && (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-md", iconWrap)}>
            <Icon name={icon} size={17} />
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900 nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-stone-400">{sub}</p>}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-lg outline-none transition-transform focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 hover:-translate-y-0.5"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}
