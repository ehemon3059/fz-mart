"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import CategorySelect from "./CategorySelect";
import { SearchIcon } from "./icons";

type Cat = { id: number; name: string; slug: string };

interface Suggestion {
  name: string;
  slug: string;
  image: string | null;
  price: string;
}

// Header search: a GET form to /search (shareable URLs, works without JS)
// enhanced with a debounced typeahead dropdown. The category scope from
// CategorySelect rides along as a hidden `category` input.
export default function HeaderSearch({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const { dict } = useI18n();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounce: only fetch 200ms after typing stops, and ignore stale responses
  // (an older request resolving after a newer one) via the `active` guard.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setSuggestions([]);
      return;
    }
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`);
        if (!res.ok || !active) return;
        const data = (await res.json()) as { suggestions: Suggestion[] };
        if (active) {
          setSuggestions(data.suggestions);
          setOpen(true);
        }
      } catch {
        /* network hiccup — dropdown just stays as-is */
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Close the dropdown on any outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={boxRef} className="hdr-search" style={{ flex: 1, position: "relative" }}>
      <form className="search" action="/search" method="get" role="search">
        <CategorySelect categories={categories} />
        <input
          name="q"
          type="text"
          autoComplete="off"
          placeholder={dict.common.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
        />
        <button type="submit">
          <SearchIcon size={17} /> {dict.common.search}
        </button>
      </form>

      {open && suggestions.length > 0 && (
        <div className="search-suggest" role="listbox">
          {suggestions.map((s) => (
            <button
              key={s.slug}
              type="button"
              className="search-suggest-item"
              onMouseDown={(e) => {
                // onMouseDown (before the input blur closes the box) so the
                // navigation isn't cancelled by the outside-click handler.
                e.preventDefault();
                setOpen(false);
                router.push(`/products/${s.slug}`);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.image ?? "/placeholder.svg"} alt="" className="search-suggest-thumb" />
              <span className="search-suggest-name">{s.name}</span>
              <span className="search-suggest-price">{s.price}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
