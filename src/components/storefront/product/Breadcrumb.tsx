import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface Crumb {
  name: string;
  href?: string;
}

/**
 * Breadcrumb trail. The final crumb is the current product and never a link.
 * Long product names truncate on mobile so the trail stays on one line.
 */
export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex items-center gap-1 overflow-hidden text-[12.5px] text-slate-500">
        <li className="shrink-0">
          <Link href="/" className="flex items-center gap-1 rounded px-1 py-0.5 transition hover:text-slate-800">
            <Home size={13} /> Home
          </Link>
        </li>
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.name}-${i}`} className={last ? "flex min-w-0 items-center gap-1" : "flex shrink-0 items-center gap-1"}>
              <ChevronRight size={13} className="shrink-0 text-slate-300" />
              {c.href && !last ? (
                <Link href={c.href} className="rounded px-1 py-0.5 transition hover:text-slate-800">
                  {c.name}
                </Link>
              ) : (
                <span className="truncate font-medium text-slate-800" aria-current="page">
                  {c.name}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
