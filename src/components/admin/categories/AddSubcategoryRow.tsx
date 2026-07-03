"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { saveSubcategory } from "@/app/(admin)/admin/(protected)/categories/actions";

interface Props {
  categoryId: number;
  /** Called optimistically when the server action succeeds */
  onAdded: (name: string, slug: string) => void;
}

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function AddSubcategoryRow({ categoryId, onAdded }: Props) {
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("name", trimmed);
    formData.set("categoryId", String(categoryId));
    formData.set("isActive", "on");
    formData.set("sortOrder", "0");

    const result = await saveSubcategory(null, formData);

    setPending(false);

    if (result?.error) {
      setError(result.error);
    } else {
      onAdded(trimmed, toSlug(trimmed));
      setName("");
      inputRef.current?.focus();
    }
  };

  return (
    <div className="mt-3 space-y-1.5">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex flex-1 items-center overflow-hidden rounded-lg border border-stone-200 bg-stone-50 transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-50">
          <span className="pl-3 text-stone-400">
            <Icon name="plus" size={15} />
          </span>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New subcategory name…"
            className="flex-1 bg-transparent px-2.5 py-2.5 text-[14px] text-stone-800 outline-none placeholder:text-stone-400"
          />
        </div>
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </form>
      {error && <p className="text-[12.5px] text-red-600">{error}</p>}
    </div>
  );
}
