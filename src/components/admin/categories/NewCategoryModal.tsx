"use client";

import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { saveCategory } from "@/app/(admin)/admin/(protected)/categories/actions";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called after a successful create so the list can refresh. */
  onCreated: () => void;
  /** When set, the new node is created as a child of this category. */
  parentId?: number | null;
  /** Parent's name, shown in the dialog header for context. */
  parentName?: string | null;
}

function Toggle({
  checked,
  onChange,
  label,
  sublabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sublabel?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-semibold text-stone-800">{label}</p>
        {sublabel && <p className="text-[12px] text-stone-400">{sublabel}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={["relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-brand-600" : "bg-stone-300"].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
            checked ? "left-[22px]" : "left-0.5",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

export function NewCategoryModal({ open, onClose, onCreated, parentId, parentName }: Props) {
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Reset form state each time the modal is (re)opened.
  useEffect(() => {
    if (open) {
      setName("");
      setSortOrder(0);
      setIsActive(true);
      setError(null);
    }
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("sortOrder", String(sortOrder));
    if (isActive) formData.set("isActive", "on");
    if (parentId != null) formData.set("parentId", String(parentId));

    startTransition(async () => {
      const result = await saveCategory(null, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        onCreated();
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-stone-900/50" onClick={onClose} />

      {/* dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="font-manrope relative w-full max-w-[480px] overflow-hidden rounded-2xl bg-white shadow-xl"
        style={{ animation: "fz-pop .2s ease" }}
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <h2 className="text-[17px] font-bold tracking-tight text-stone-900">
            {parentName ? `New sub-category in “${parentName}”` : "New Category"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
          >
            <Icon name="x" size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-5 py-5">
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</p>
            )}

            <div>
              <label className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-semibold text-stone-700">
                <span>Category name</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center overflow-hidden rounded-lg border border-stone-200 bg-white transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-50">
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Electronics"
                  className="w-full bg-transparent px-3 py-2.5 text-[14px] text-stone-800 outline-none placeholder:text-stone-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-semibold text-stone-700">
                <span>Sort order</span>
                <span className="ml-auto text-[12px] font-normal text-stone-400">lower shows first</span>
              </label>
              <div className="flex items-center overflow-hidden rounded-lg border border-stone-200 bg-white transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-50">
                <input
                  type="number"
                  step="1"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value === "" ? 0 : Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-transparent px-3 py-2.5 text-[14px] text-stone-800 outline-none placeholder:text-stone-400"
                />
              </div>
            </div>

            <div className="rounded-lg border border-stone-200 px-4 py-3.5">
              <Toggle
                checked={isActive}
                onChange={setIsActive}
                label="Active"
                sublabel={isActive ? "Visible on the storefront" : "Hidden — won't show in the catalog"}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-stone-100 bg-stone-50/60 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[13.5px] font-semibold text-stone-600 transition hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
            >
              {pending ? "Creating…" : "Create Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
