import Link from "next/link";
import { Icon } from "@/components/icons";
import { StatusBadge } from "./StatusBadge";
import { SlugChip } from "./SlugChip";

export interface AdminPageRow {
  slug: string;
  title: string;
  status: "PUBLISHED" | "DRAFT";
  updatedAt: Date;
  category: string;
}

function fmtDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relDays(date: Date) {
  const diff = Math.round((Date.now() - date.getTime()) / 86_400_000);
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff < 30) return `${diff} days ago`;
  const m = Math.round(diff / 30);
  return `${m} month${m === 1 ? "" : "s"} ago`;
}

interface Props {
  page: AdminPageRow;
  /** Suppress top border for the first row */
  first?: boolean;
}

export function PageRow({ page, first }: Props) {
  return (
    <div
      className={[
        "group flex items-center gap-4 px-5 py-3.5 transition hover:bg-stone-50/70",
        first ? "" : "border-t border-stone-100",
      ].join(" ")}
    >
      {/* File icon */}
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400 transition group-hover:bg-brand-50 group-hover:text-brand-600">
        <Icon name="file" size={17} />
      </span>

      {/* Title + slug + date */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[15px] font-semibold text-stone-800">
            {page.title}
          </span>
          <SlugChip slug={page.slug} />
        </div>
        <p className="mt-0.5 text-[12.5px] text-stone-400">
          Updated {fmtDate(page.updatedAt)} · {relDays(page.updatedAt)}
        </p>
      </div>

      {/* Status badge */}
      <div className="hidden shrink-0 sm:block">
        <StatusBadge status={page.status} />
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        <Link
          href={`/pages/${page.slug}`}
          target="_blank"
          className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 md:flex"
        >
          <Icon name="externalLink" size={15} />
          View on site
        </Link>
        <Link
          href={`/admin/pages/${page.slug}/edit`}
          className="flex items-center gap-1.5 rounded-lg bg-stone-800 px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-stone-900"
        >
          <Icon name="edit" size={15} />
          Edit
        </Link>
      </div>
    </div>
  );
}
