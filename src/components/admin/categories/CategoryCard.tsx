import Link from "next/link";
import { Icon } from "@/components/icons";
import { SlugChip } from "./SlugChip";
import { InactiveBadge } from "./InactiveBadge";
import { CountBadge } from "./CountBadge";
import { DeleteBtn } from "./DeleteBtn";
import { SubcategoryRow } from "./SubcategoryRow";
import { AddSubcategoryRow } from "./AddSubcategoryRow";
import type { AdminCategory } from "./CategoriesClient";

interface ConfirmTarget {
  type: "cat" | "sub";
  id: number;
}

interface Props {
  cat: AdminCategory;
  confirmTarget: ConfirmTarget | null;
  deleteError: string | null;
  onDeleteCatFirst: () => void;
  onDeleteCatConfirm: () => void;
  onDeleteSubFirst: (subId: number) => void;
  onDeleteSubConfirm: (subId: number) => void;
  onDeleteCancel: () => void;
  /** Optimistic add — parent merges the new sub into state */
  onSubAdded: (name: string, slug: string) => void;
}

export function CategoryCard({
  cat,
  confirmTarget,
  deleteError,
  onDeleteCatFirst,
  onDeleteCatConfirm,
  onDeleteSubFirst,
  onDeleteSubConfirm,
  onDeleteCancel,
  onSubAdded,
}: Props) {
  const isCatConfirm = confirmTarget?.type === "cat" && confirmTarget.id === cat.id;

  return (
    <div
      className={[
        "overflow-hidden rounded-xl border bg-white shadow-soft transition",
        isCatConfirm ? "border-red-200" : "border-stone-200",
      ].join(" ")}
    >
      {/* Category header */}
      <div
        className={[
          "flex flex-wrap items-center gap-3 px-5 py-4",
          isCatConfirm ? "bg-red-50/40" : "",
        ].join(" ")}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="text-[15.5px] font-bold text-stone-900">{cat.name}</span>
          <SlugChip slug={cat.slug} />
          {!cat.isActive && <InactiveBadge />}
          <CountBadge count={cat.subcategories.length} />
        </div>

        <div className={["flex items-center gap-1.5 shrink-0", isCatConfirm ? "self-start mt-0.5" : ""].join(" ")}>
          {!isCatConfirm && (
            <Link
              href={`/admin/categories/${cat.id}/edit`}
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-[13px] font-semibold text-stone-600 transition hover:bg-stone-50 hover:border-stone-300"
            >
              <Icon name="pencil" size={15} />
              <span className="hidden sm:inline">Edit</span>
            </Link>
          )}
          <DeleteBtn
            size="md"
            confirmed={isCatConfirm}
            onFirst={onDeleteCatFirst}
            onConfirm={onDeleteCatConfirm}
            onCancel={onDeleteCancel}
          />
        </div>
      </div>

      {/* Delete error */}
      {deleteError && (
        <div className="mx-5 mb-1 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <Icon name="warn" size={16} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-[13px] text-red-700">{deleteError}</p>
        </div>
      )}

      {/* Subcategories */}
      <div className="border-t border-stone-100 px-5 py-4">
        {cat.subcategories.length === 0 ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-stone-200 px-4 py-3.5 text-[13.5px] text-stone-400">
            <Icon name="plus" size={16} className="shrink-0" />
            No subcategories yet — add one below.
          </div>
        ) : (
          <div className="ml-1 space-y-0.5 border-l-2 border-brand-100 pl-4">
            {cat.subcategories.map((sub) => {
              const isSubConfirm = confirmTarget?.type === "sub" && confirmTarget.id === sub.id;
              return (
                <SubcategoryRow
                  key={sub.id}
                  sub={sub}
                  confirmed={isSubConfirm}
                  onDeleteFirst={() => onDeleteSubFirst(sub.id)}
                  onDeleteConfirm={() => onDeleteSubConfirm(sub.id)}
                  onDeleteCancel={onDeleteCancel}
                />
              );
            })}
          </div>
        )}

        <AddSubcategoryRow categoryId={cat.id} onAdded={onSubAdded} />
      </div>
    </div>
  );
}
