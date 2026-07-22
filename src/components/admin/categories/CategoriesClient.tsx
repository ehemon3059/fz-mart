"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { SlugChip } from "./SlugChip";
import { InactiveBadge } from "./InactiveBadge";
import { NewCategoryModal } from "./NewCategoryModal";
import {
  removeCategory,
  getDeleteImpact,
  moveCategory,
} from "@/app/(admin)/admin/(protected)/categories/actions";
import { buildTree, type TreeNode } from "@/server/categories/tree";
import type { DeleteImpact } from "@/server/categories/tree";
import type { listAllCategories } from "@/server/categories/admin";

export type AdminCategory = Awaited<ReturnType<typeof listAllCategories>>[number];

interface Props {
  initialCategories: AdminCategory[];
}

function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 lg:bottom-6" style={{ animation: "fz-pop .25s ease" }}>
      <div className="flex items-center gap-2.5 rounded-xl bg-stone-900 px-4 py-3 text-[14px] font-medium text-white shadow-lg">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white">
          <Icon name="check" size={13} strokeWidth={2.6} />
        </span>
        {msg}
      </div>
    </div>
  );
}

type DeleteTarget = { id: number; name: string };

/**
 * Root client component for /admin/categories. Renders the whole category tree
 * recursively (any depth): per-node Add-child / Edit / reorder / Delete. Delete
 * first checks how much the node's subtree holds and blocks non-empty nodes.
 */
export function CategoriesClient({ initialCategories }: Props) {
  const router = useRouter();
  const [cats, setCats] = useState<AdminCategory[]>(initialCategories);
  const [toast, setToast] = useState("");
  // Modal target: null = closed; { id: null } = new root; else new child.
  const [modalParent, setModalParent] = useState<{ id: number | null; name: string | null } | null>(null);
  // Delete dialog state.
  const [delTarget, setDelTarget] = useState<DeleteTarget | null>(null);
  const [impact, setImpact] = useState<DeleteImpact | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const tree = useMemo(() => buildTree(cats), [cats]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  // Open the delete dialog and fetch the impact counts to show in it.
  const openDelete = (id: number, name: string) => {
    setDelTarget({ id, name });
    setImpact(null);
    setDelError(null);
    setImpactLoading(true);
    startTransition(async () => {
      try {
        setImpact(await getDeleteImpact(id));
      } catch {
        setDelError("Couldn't check this category. Please try again.");
      } finally {
        setImpactLoading(false);
      }
    });
  };

  const confirmDelete = () => {
    if (!delTarget) return;
    const { id } = delTarget;
    startTransition(async () => {
      const result = await removeCategory(id);
      if (result.ok) {
        setCats((p) => p.filter((c) => c.id !== id));
        setDelTarget(null);
        flash("Category deleted");
      } else if (result.blocked) {
        setImpact({ descendantCount: result.descendantCount, productCount: result.productCount });
      } else {
        setDelError(result.error);
      }
    });
  };

  // Reorder among siblings — optimistic local re-index mirrors the server.
  const move = (id: number, direction: "up" | "down") => {
    setCats((prev) => {
      const node = prev.find((c) => c.id === id);
      if (!node) return prev;
      const siblings = prev
        .filter((c) => c.parentId === node.parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      const i = siblings.findIndex((s) => s.id === id);
      const j = direction === "up" ? i - 1 : i + 1;
      if (i === -1 || j < 0 || j >= siblings.length) return prev;
      [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
      const order = new Map(siblings.map((s, idx) => [s.id, idx]));
      return prev.map((c) => (order.has(c.id) ? { ...c, sortOrder: order.get(c.id)! } : c));
    });
    startTransition(async () => {
      await moveCategory(id, direction);
    });
  };

  const blocked = impact != null && (impact.descendantCount > 0 || impact.productCount > 0);

  return (
    <>
      <div className="mb-5 flex justify-end">
        <button
          type="button"
          onClick={() => setModalParent({ id: null, name: null })}
          className="hidden items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-brand-700 sm:flex"
        >
          <Icon name="plus" size={17} />
          New Category
        </button>
      </div>

      {tree.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 px-5 py-10 text-center text-[14px] text-stone-400">
          No categories yet — create your first one.
        </div>
      ) : (
        <div className="space-y-1.5">
          {tree.map((node, i) => (
            <CategoryNode
              key={node.id}
              node={node}
              depth={0}
              index={i}
              total={tree.length}
              onAddChild={(id, name) => setModalParent({ id, name })}
              onEdit={(id) => router.push(`/admin/categories/${id}/edit`)}
              onDelete={openDelete}
              onMove={move}
            />
          ))}
        </div>
      )}

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200 bg-white p-4 lg:hidden">
        <button
          type="button"
          onClick={() => setModalParent({ id: null, name: null })}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-[15px] font-semibold text-white shadow"
        >
          <Icon name="plus" size={19} />
          New Category
        </button>
      </div>

      <NewCategoryModal
        open={modalParent !== null}
        parentId={modalParent?.id ?? null}
        parentName={modalParent?.name ?? null}
        onClose={() => setModalParent(null)}
        onCreated={() => {
          flash(modalParent?.name ? "Sub-category created" : "Category created");
          router.refresh();
        }}
      />

      {delTarget && (
        <DeleteDialog
          name={delTarget.name}
          loading={impactLoading}
          impact={impact}
          blocked={blocked}
          error={delError}
          onCancel={() => setDelTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      <Toast msg={toast} />
    </>
  );
}

interface NodeProps {
  node: TreeNode<AdminCategory>;
  depth: number;
  index: number;
  total: number;
  onAddChild: (id: number, name: string) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number, name: string) => void;
  onMove: (id: number, direction: "up" | "down") => void;
}

function CategoryNode(props: NodeProps) {
  const { node, depth, index, total } = props;

  return (
    <div>
      <div
        className={[
          "flex flex-wrap items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-soft transition",
          node.isActive ? "" : "opacity-60",
        ].join(" ")}
        style={{ marginLeft: depth * 22 }}
      >
        {depth > 0 && <Icon name="chevronRight" size={13} className="shrink-0 text-stone-300" />}

        {/* Reorder among siblings */}
        <div className="flex shrink-0 flex-col">
          <button
            type="button"
            aria-label="Move up"
            disabled={index === 0}
            onClick={() => props.onMove(node.id, "up")}
            className="flex h-4 w-5 items-center justify-center rounded text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            ▲
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={index === total - 1}
            onClick={() => props.onMove(node.id, "down")}
            className="flex h-4 w-5 items-center justify-center rounded text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            ▼
          </button>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="text-[14.5px] font-bold text-stone-900">{node.name}</span>
          <SlugChip slug={node.slug} />
          {!node.isActive && <InactiveBadge />}
          {node.children.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-[11.5px] font-semibold text-stone-500">
              {node.children.length} sub{node.children.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => props.onAddChild(node.id, node.name)}
            className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-[13px] font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50"
          >
            <Icon name="plus" size={15} />
            <span className="hidden sm:inline">Add sub</span>
          </button>
          <button
            type="button"
            onClick={() => props.onEdit(node.id)}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-[13px] font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50"
          >
            <Icon name="pencil" size={15} />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button
            type="button"
            aria-label="Delete"
            title="Delete"
            onClick={() => props.onDelete(node.id, node.name)}
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-500"
          >
            <Icon name="trash" size={16} />
            <span className="hidden text-[13px] font-medium sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {node.children.length > 0 && (
        <div className="mt-1.5 space-y-1.5">
          {node.children.map((child, i) => (
            <CategoryNode
              key={child.id}
              {...props}
              node={child}
              depth={depth + 1}
              index={i}
              total={node.children.length}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DeleteDialog({
  name,
  loading,
  impact,
  blocked,
  error,
  onCancel,
  onConfirm,
}: {
  name: string;
  loading: boolean;
  impact: DeleteImpact | null;
  blocked: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/50" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        className="font-manrope relative w-full max-w-[460px] overflow-hidden rounded-2xl bg-white shadow-xl"
        style={{ animation: "fz-pop .2s ease" }}
      >
        <div className="border-b border-stone-100 px-5 py-4">
          <h2 className="text-[17px] font-bold tracking-tight text-stone-900">Delete “{name}”?</h2>
        </div>

        <div className="space-y-3 px-5 py-5 text-[13.5px] text-stone-600">
          {loading && <p className="text-stone-400">Checking what this would affect…</p>}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</p>
          )}

          {!loading && impact && (
            blocked ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
                <p className="font-semibold">This category isn’t empty.</p>
                <p className="mt-1">
                  It contains{" "}
                  <b>
                    {impact.descendantCount} sub-categor{impact.descendantCount === 1 ? "y" : "ies"}
                  </b>{" "}
                  and{" "}
                  <b>
                    {impact.productCount} product{impact.productCount === 1 ? "" : "s"}
                  </b>
                  . Move or delete its contents first, then delete this category.
                </p>
              </div>
            ) : (
              <p>This will permanently remove the category. This can’t be undone.</p>
            )
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-stone-100 bg-stone-50/60 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[13.5px] font-semibold text-stone-600 transition hover:bg-stone-50"
          >
            {blocked ? "Close" : "Cancel"}
          </button>
          {!blocked && (
            <button
              type="button"
              disabled={loading || !impact}
              onClick={onConfirm}
              className="flex items-center gap-1.5 rounded-xl bg-red-500 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-red-600 disabled:opacity-50"
            >
              <Icon name="trash" size={15} strokeWidth={2} />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
