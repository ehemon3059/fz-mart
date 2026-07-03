"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "./icons";

type Cat = { id: number; name: string; slug: string };

// Lets the search bar scope a query to one category. Selection is stored as
// a hidden input inside the surrounding <form> (rendered by Header.tsx), so
// submitting the existing GET form to /products just picks it up — no
// client-side navigation needed here.
export default function CategorySelect({ categories }: { categories: Cat[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Cat | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" className="cat-sel" onClick={() => setOpen((v) => !v)}>
        {selected ? selected.name : "All Categories"} <ChevronDown size={12} />
      </button>
      {selected && <input type="hidden" name="category" value={selected.slug} />}

      {open && (
        <div className="cat-sel-menu" role="listbox">
          <button
            type="button"
            className={`cat-sel-opt${selected ? "" : " active"}`}
            onClick={() => {
              setSelected(null);
              setOpen(false);
            }}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`cat-sel-opt${selected?.id === cat.id ? " active" : ""}`}
              onClick={() => {
                setSelected(cat);
                setOpen(false);
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
