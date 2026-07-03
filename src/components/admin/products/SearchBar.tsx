"use client";

import { Icon } from "@/components/icons";

export type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

interface Props {
  q: string;
  setQ: (v: string) => void;
  filter: StatusFilter;
  setFilter: (v: StatusFilter) => void;
}

export function SearchBar({ q, setQ, filter, setFilter }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[180px]">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
          <Icon name="search" size={16} />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="h-10 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-4 text-[14px] text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
        />
      </div>
      <div className="flex rounded-xl border border-stone-200 bg-white p-1 gap-1">
        {(["ALL", "ACTIVE", "INACTIVE"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={[
              "rounded-lg px-3 py-1.5 text-[13px] font-semibold transition",
              filter === f ? "bg-stone-800 text-white" : "text-stone-500 hover:bg-stone-50",
            ].join(" ")}
          >
            {f === "ALL" ? "All" : f === "ACTIVE" ? "Active" : "Inactive"}
          </button>
        ))}
      </div>
    </div>
  );
}
