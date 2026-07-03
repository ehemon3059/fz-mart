import type { AdminProduct } from "./ProductsListClient";

interface Props {
  products: AdminProduct[];
}

export function StatsStrip({ products }: Props) {
  const total = products.length;
  const active = products.filter((p) => p.status === "ACTIVE").length;
  const oos = products.filter((p) => p.stock <= 0).length;

  const stats = [
    { label: "Total products", value: total, sub: "in catalog", tone: "neutral" as const },
    { label: "Active", value: active, sub: "live on storefront", tone: "brand" as const },
    { label: "Out of stock", value: oos, sub: "need restocking", tone: "red" as const },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft">
          <p className="text-[12.5px] font-medium text-stone-500">{s.label}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={[
                "text-[28px] font-extrabold tracking-tight",
                s.tone === "brand" ? "text-brand-600" : s.tone === "red" ? "text-red-500" : "text-stone-900",
              ].join(" ")}
            >
              {s.value}
            </span>
            <span className="text-[12px] text-stone-400">{s.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
