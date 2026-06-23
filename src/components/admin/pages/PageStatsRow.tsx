interface StatCard {
  label: string;
  value: number;
  sub: string;
  tone: "neutral" | "brand" | "amber";
}

interface Props {
  total: number;
  published: number;
  draft: number;
}

export function PageStatsRow({ total, published, draft }: Props) {
  const stats: StatCard[] = [
    { label: "Total pages",  value: total,     sub: "across 4 sections",  tone: "neutral" },
    { label: "Published",    value: published, sub: "live on storefront",  tone: "brand"   },
    { label: "Drafts",       value: draft,     sub: "not yet visible",     tone: "amber"   },
  ];

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft"
        >
          <p className="text-[13px] font-medium text-stone-500">{s.label}</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span
              className={[
                "text-[30px] font-extrabold tracking-tight",
                s.tone === "brand"
                  ? "text-brand-600"
                  : s.tone === "amber"
                  ? "text-amber-500"
                  : "text-stone-900",
              ].join(" ")}
            >
              {s.value}
            </span>
            <span className="text-[12.5px] text-stone-400">{s.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
