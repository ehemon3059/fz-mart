"use client";

/**
 * Category picker — three radios, then a category, then a sub-category.
 *
 * The flat "every node, indented" dropdown this replaces listed all 34
 * categories at once and gave no clue which of them sold by size and which
 * didn't, so picking the right one meant already knowing the answer.
 *
 * Now the shape is chosen FIRST and the lists below it only ever contain
 * categories that actually sell that way (Category.defaultSellingType, resolved
 * up the tree). A root is offered whenever the root itself OR anything beneath
 * it matches — otherwise "Baby Clothing & Apparel" would be unreachable under
 * Sizes, since its parent "Baby Items" is SINGLE.
 *
 * Products can still live on ANY node, so the sub-category step offers the
 * parent itself as an option — but only when the parent's own type matches, or
 * it would hand back a category of the wrong shape.
 */

import { useMemo } from "react";
import { Icon } from "@/components/icons";
import { inheritedSellingType, type SellingType } from "@/lib/category-inheritance";
import { buildTree, type TreeNode } from "@/server/categories/tree";
import DropSelect from "./DropSelect";
import type { Category } from "./types";

const KINDS: { key: SellingType; title: string; blurb: string }[] = [
  { key: "single", title: "Single item", blurb: "No colour or size" },
  { key: "colors", title: "Colours", blurb: "Product comes in colours" },
  { key: "sizes", title: "Sizes (+ colours)", blurb: "Product has sizes, and colours if it has them" },
];

/** Every node at or below `node`, itself first. */
function flatten(node: TreeNode<Category>): TreeNode<Category>[] {
  return [node, ...node.children.flatMap(flatten)];
}

export default function CategoryPicker({
  kind,
  onKindChange,
  value,
  onChange,
  error,
  categories,
}: {
  /** The radio choice; "" until one is picked. */
  kind: SellingType | "";
  onKindChange: (next: SellingType) => void;
  /** Chosen category id, as a select value. */
  value: string;
  onChange: (next: string) => void;
  error?: string;
  categories: Category[];
}) {
  const roots = useMemo(() => buildTree(categories), [categories]);
  const typeOf = useMemo(
    () => (id: number) => inheritedSellingType(categories, id, true),
    [categories],
  );

  /** Roots worth showing: they match, or something beneath them does. */
  const rootOptions = useMemo(() => {
    if (!kind) return [];
    return roots.filter((r) => flatten(r).some((n) => typeOf(n.id) === kind));
  }, [roots, kind, typeOf]);

  // Which root the current value sits under, and whether the value is that root
  // itself or one of its descendants. Derived rather than stored so the two
  // selects can never disagree with the id actually being submitted.
  const { rootId, subId } = useMemo(() => {
    const id = value ? Number(value) : null;
    if (id == null || Number.isNaN(id)) return { rootId: "", subId: "" };
    for (const r of roots) {
      const all = flatten(r);
      if (all.some((n) => n.id === id)) {
        return { rootId: String(r.id), subId: r.id === id ? "" : String(id) };
      }
    }
    return { rootId: "", subId: "" };
  }, [value, roots]);

  const activeRoot = rootOptions.find((r) => String(r.id) === rootId) ?? null;

  /** Descendants of the chosen root that match, indented by depth. */
  const subOptions = useMemo(() => {
    if (!activeRoot || !kind) return [];
    const out: { id: number; label: string; depth: number }[] = [];
    const walk = (nodes: TreeNode<Category>[], depth: number) => {
      for (const n of nodes) {
        if (flatten(n).some((d) => typeOf(d.id) === kind)) {
          out.push({ id: n.id, label: n.name, depth });
          walk(n.children, depth + 1);
        }
      }
    };
    walk(activeRoot.children, 0);
    return out;
  }, [activeRoot, kind, typeOf]);

  // Placing the product on the root itself only makes sense when the root's own
  // type is the one being asked for. "Baby Items" is SINGLE, so it is offered
  // as a container for its sized children but never as the answer itself.
  const rootIsValidTarget = activeRoot ? typeOf(activeRoot.id) === kind : false;

  return (
    <div className="space-y-4">
      {/* ── 1. the shape ── */}
      <fieldset>
        <legend className="mb-2 flex items-baseline gap-1.5 text-[13px] font-semibold text-stone-700">
          <span>How is it sold?</span>
          <span className="text-red-500">*</span>
          <span className="ml-auto text-[12px] font-normal text-stone-400">pick this first</span>
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {KINDS.map((k) => {
            const active = kind === k.key;
            return (
              <label
                key={k.key}
                className={[
                  "flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition",
                  active
                    ? "border-brand-500 bg-brand-50/40 shadow-sm ring-1 ring-brand-500"
                    : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/60",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="sellingKind"
                  checked={active}
                  onChange={() => onKindChange(k.key)}
                  className="mt-0.5 h-4 w-4 shrink-0 border-stone-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-bold text-stone-800">{k.title}</span>
                  <span className="block text-[12px] leading-snug text-stone-500">{k.blurb}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* ── 2. the category ── */}
      {kind && (
        <div>
          <label className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-semibold text-stone-700">
            <span>Category</span>
            <span className="text-red-500">*</span>
            <span className="ml-auto text-[12px] font-normal text-stone-400">
              {rootOptions.length} that sell this way
            </span>
          </label>
          <DropSelect
            value={rootId}
            onChange={(next) => {
              if (!next) return onChange("");
              // Land on the root when it is itself a valid target, otherwise
              // leave the choice empty so the sub-category step must answer.
              const node = roots.find((r) => String(r.id) === next);
              const ok = node && typeOf(node.id) === kind;
              onChange(ok ? next : "");
            }}
            placeholder="Select category…"
            error={!!error}
            options={rootOptions.map((r) => ({ value: String(r.id), label: r.name }))}
          />
          {rootOptions.length === 0 && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-medium text-amber-600">
              <Icon name="warn" size={13} />
              No category sells this way yet — set one up under Categories first.
            </p>
          )}
        </div>
      )}

      {/* ── 3. the sub-category ── */}
      {activeRoot && subOptions.length > 0 && (
        <div>
          <label className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-semibold text-stone-700">
            <span>Sub-category</span>
            {!rootIsValidTarget && <span className="text-red-500">*</span>}
            {rootIsValidTarget && (
              <span className="ml-auto text-[12px] font-normal text-stone-400">optional</span>
            )}
          </label>
          <DropSelect
            value={subId}
            onChange={(next) => onChange(next || String(activeRoot.id))}
            placeholder={
              rootIsValidTarget
                ? `— None, put it in “${activeRoot.name}” —`
                : "Select sub-category…"
            }
            error={!!error && !rootIsValidTarget && !subId}
            options={subOptions.map((o) => ({
              value: String(o.id),
              label: o.depth ? `└ ${o.label}` : o.label,
              depth: o.depth,
            }))}
          />
          {!rootIsValidTarget && !subId && (
            <p className="mt-1.5 text-[12px] text-stone-400">
              “{activeRoot.name}” itself is not sold this way — pick one of its sub-categories.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
