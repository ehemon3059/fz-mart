"use client";

/**
 * Category tree select.
 *
 * Products can live on ANY node — a root, a mid-level, or a leaf — so the
 * picker lists every category indented by depth and shows the chosen node's
 * full breadcrumb underneath for confirmation.
 */

import { useMemo } from "react";
import { Icon } from "@/components/icons";
import { buildTree, ancestorsOf, type TreeNode } from "@/server/categories/tree";
import type { Category } from "./types";

export default function CategorySelect({
  value,
  onChange,
  error,
  categories,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  categories: Category[];
}) {
  const options = useMemo(() => {
    const out: { id: number; label: string }[] = [];
    const walk = (nodes: TreeNode<Category>[], depth: number) => {
      for (const n of nodes) {
        out.push({ id: n.id, label: `${"  ".repeat(depth)}${depth ? "└ " : ""}${n.name}` });
        walk(n.children, depth + 1);
      }
    };
    walk(buildTree(categories), 0);
    return out;
  }, [categories]);

  const breadcrumb = useMemo(() => {
    const id = Number(value);
    if (!value || Number.isNaN(id)) return "";
    const self = categories.find((c) => c.id === id);
    if (!self) return "";
    return [...ancestorsOf(id, categories).map((c) => c.name), self.name].join(" › ");
  }, [value, categories]);

  return (
    <div>
      <div
        className={[
          "relative flex items-center overflow-hidden rounded-lg border bg-white transition focus-within:ring-4",
          error
            ? "border-red-300 focus-within:border-red-500 focus-within:ring-red-50"
            : "border-stone-200 focus-within:border-brand-500 focus-within:ring-brand-50",
        ].join(" ")}
      >
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="w-full appearance-none bg-transparent px-3 py-2.5 pr-9 text-[14px] text-stone-800 outline-none"
        >
          <option value="">Select category…</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 text-stone-400">
          <Icon name="chevronDown" size={16} />
        </span>
      </div>
      {breadcrumb && <p className="mt-1.5 text-[12.5px] text-stone-500">In: {breadcrumb}</p>}
    </div>
  );
}
