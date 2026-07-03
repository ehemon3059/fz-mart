"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { ProductRow } from "./ProductRow";
import { ProductMobileCard } from "./ProductMobileCard";
import { SearchBar, type StatusFilter } from "./SearchBar";
import { EmptyState } from "./EmptyState";
import { removeProduct } from "@/app/(admin)/admin/(protected)/products/actions";
import type { listAllProducts } from "@/server/products/admin";

export type AdminProduct = Awaited<ReturnType<typeof listAllProducts>>[number];

interface Props {
  initialProducts: AdminProduct[];
}

function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 lg:bottom-6">
      <div className="flex items-center gap-2.5 rounded-xl bg-stone-900 px-4 py-3 text-[14px] font-medium text-white shadow-lg">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500">
          <Icon name="check" size={13} strokeWidth={2.6} />
        </span>
        {msg}
      </div>
    </div>
  );
}

export function ProductsListClient({ initialProducts }: Props) {
  const [products, setProducts] = useState<AdminProduct[]>(initialProducts);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [, startTransition] = useTransition();

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2600);
  };

  const filtered = useMemo(
    () =>
      products
        .filter((p) => filter === "ALL" || p.status === filter)
        .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase())),
    [products, q, filter],
  );

  const onDeleteFirst = (id: number) => setConfirmId(id);
  const onDeleteCancel = () => setConfirmId(null);
  const onDeleteConfirm = (id: number) => {
    setConfirmId(null);
    startTransition(async () => {
      const result = await removeProduct(id);
      if (result?.error) {
        flash(result.error);
      } else {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        flash("Product deleted");
      }
    });
  };

  return (
    <>
      <SearchBar q={q} setQ={setQ} filter={filter} setFilter={setFilter} />

      {(q || filter !== "ALL") && (
        <p className="mt-4 text-[13px] text-stone-400">
          Showing <b className="text-stone-700">{filtered.length}</b> of {products.length} products
        </p>
      )}

      <div className="mt-6">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-soft md:block">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50 text-left">
                    {["Product", "Price", "Stock", "Status", "Actions", ""].map((h, i) => (
                      <th
                        key={i}
                        className={[
                          "px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-wider text-stone-400",
                          h === "Actions" ? "text-right" : "text-left",
                        ].join(" ")}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <ProductRow
                      key={p.id}
                      p={p}
                      isConfirm={confirmId === p.id}
                      onDeleteFirst={() => onDeleteFirst(p.id)}
                      onDeleteConfirm={() => onDeleteConfirm(p.id)}
                      onDeleteCancel={onDeleteCancel}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 md:hidden">
              {filtered.map((p) => (
                <ProductMobileCard
                  key={p.id}
                  p={p}
                  isConfirm={confirmId === p.id}
                  onDeleteFirst={() => onDeleteFirst(p.id)}
                  onDeleteConfirm={() => onDeleteConfirm(p.id)}
                  onDeleteCancel={onDeleteCancel}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200 bg-white p-4 lg:hidden">
        <Link
          href="/admin/products/new"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-[15px] font-semibold text-white shadow"
        >
          <Icon name="plus" size={19} /> New Product
        </Link>
      </div>

      <Toast msg={toast} />
    </>
  );
}
