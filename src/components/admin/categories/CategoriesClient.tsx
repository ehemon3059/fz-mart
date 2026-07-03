"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { CategoryCard } from "./CategoryCard";
import { NewCategoryModal } from "./NewCategoryModal";
import { removeCategory, removeSubcategory } from "@/app/(admin)/admin/(protected)/categories/actions";
import type { listAllCategories } from "@/server/categories/admin";

export type AdminCategory = Awaited<ReturnType<typeof listAllCategories>>[number];
type AdminSubcategory = AdminCategory["subcategories"][number];

interface ConfirmTarget {
  type: "cat" | "sub";
  id: number;
  catId?: number; // set when type === "sub"
}

interface Props {
  initialCategories: AdminCategory[];
}

let nextId = 9000; // local id counter for optimistic adds

function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div
      className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 lg:bottom-6"
      style={{ animation: "fz-pop .25s ease" }}
    >
      <div className="flex items-center gap-2.5 rounded-xl bg-stone-900 px-4 py-3 text-[14px] font-medium text-white shadow-lg">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white">
          <Icon name="check" size={13} strokeWidth={2.6} />
        </span>
        {msg}
      </div>
    </div>
  );
}

/**
 * Root client component for /admin/categories.
 * Manages all interactive state: delete confirm, optimistic sub-adds, toasts.
 */
export function CategoriesClient({ initialCategories }: Props) {
  const router = useRouter();
  const [cats, setCats] = useState<AdminCategory[]>(initialCategories);
  const [confirmTarget, setConfirm] = useState<ConfirmTarget | null>(null);
  const [deleteErrors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [, startTransition] = useTransition();

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const clearError = (key: string) =>
    setErrors((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });

  const onDeleteCatFirst = (catId: number) => {
    setConfirm({ type: "cat", id: catId });
    clearError(`cat-${catId}`);
  };

  const onDeleteCatConfirm = (catId: number) => {
    setConfirm(null);
    startTransition(async () => {
      const result = await removeCategory(catId);
      if (result?.error) {
        setErrors((prev) => ({ ...prev, [`cat-${catId}`]: result.error! }));
      } else {
        setCats((prev) => prev.filter((c) => c.id !== catId));
        flash("Category deleted");
      }
    });
  };

  const onDeleteSubFirst = (subId: number, catId: number) => {
    setConfirm({ type: "sub", id: subId, catId });
  };

  const onDeleteSubConfirm = (subId: number, catId: number) => {
    setConfirm(null);
    startTransition(async () => {
      const result = await removeSubcategory(subId);
      if (result?.error) {
        setErrors((prev) => ({ ...prev, [`sub-${subId}`]: result.error! }));
      } else {
        setCats((prev) =>
          prev.map((c) =>
            c.id === catId
              ? { ...c, subcategories: c.subcategories.filter((s) => s.id !== subId) }
              : c,
          ),
        );
        flash("Subcategory deleted");
      }
    });
  };

  const onDeleteCancel = () => setConfirm(null);

  const onSubAdded = (catId: number, name: string, slug: string) => {
    const parent = cats.find((c) => c.id === catId);
    if (!parent) return;
    const now = new Date();
    const newSub: AdminSubcategory = {
      id: ++nextId,
      name,
      slug,
      sortOrder: 0,
      isActive: true,
      categoryId: catId,
      createdAt: now,
      updatedAt: now,
    };
    setCats((prev) =>
      prev.map((c) =>
        c.id === catId ? { ...c, subcategories: [...c.subcategories, newSub] } : c,
      ),
    );
    flash(`"${name}" added`);
  };

  return (
    <>
      <div className="mb-5 flex justify-end">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="hidden items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-brand-700 sm:flex"
        >
          <Icon name="plus" size={17} />
          New Category
        </button>
      </div>

      <div className="space-y-5">
        {cats.map((cat) => (
          <CategoryCard
            key={cat.id}
            cat={cat}
            confirmTarget={confirmTarget}
            deleteError={deleteErrors[`cat-${cat.id}`] ?? null}
            onDeleteCatFirst={() => onDeleteCatFirst(cat.id)}
            onDeleteCatConfirm={() => onDeleteCatConfirm(cat.id)}
            onDeleteSubFirst={(subId) => onDeleteSubFirst(subId, cat.id)}
            onDeleteSubConfirm={(subId) => onDeleteSubConfirm(subId, cat.id)}
            onDeleteCancel={onDeleteCancel}
            onSubAdded={(name, slug) => onSubAdded(cat.id, name, slug)}
          />
        ))}
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200 bg-white p-4 lg:hidden">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-[15px] font-semibold text-white shadow"
        >
          <Icon name="plus" size={19} />
          New Category
        </button>
      </div>

      <NewCategoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          flash("Category created");
          router.refresh();
        }}
      />

      <Toast msg={toast} />
    </>
  );
}
