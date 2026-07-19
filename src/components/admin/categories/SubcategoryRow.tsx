import Link from "next/link";
import { Icon } from "@/components/icons";
import { SlugChip } from "./SlugChip";
import { InactiveBadge } from "./InactiveBadge";
import { DeleteBtn } from "./DeleteBtn";

interface Props {
  sub: { id: number; name: string; slug: string; isActive: boolean };
  /** Whether this subcategory's delete is in "confirm" state */
  confirmed: boolean;
  onDeleteFirst: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

export function SubcategoryRow({ sub, confirmed, onDeleteFirst, onDeleteConfirm, onDeleteCancel }: Props) {
  return (
    <div
      className={[
        "group flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 transition",
        confirmed ? "bg-red-50/60" : "hover:bg-stone-50",
      ].join(" ")}
    >
      <div className="flex flex-1 min-w-0 flex-wrap items-center gap-1.5">
        <span className="text-[14px] font-medium text-stone-700">{sub.name}</span>
        <SlugChip slug={sub.slug} />
        {!sub.isActive && <InactiveBadge />}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {!confirmed && (
          <Link
            href={`/admin/categories/sub/${sub.id}/edit`}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-2 py-1 text-[12.5px] font-semibold text-stone-600 opacity-0 transition hover:bg-stone-50 hover:border-stone-300 group-hover:opacity-100"
          >
            <Icon name="pencil" size={13} />
            <span className="hidden sm:inline">Edit</span>
          </Link>
        )}
        <DeleteBtn
          size="sm"
          confirmed={confirmed}
          onFirst={onDeleteFirst}
          onConfirm={onDeleteConfirm}
          onCancel={onDeleteCancel}
        />
      </div>
    </div>
  );
}
