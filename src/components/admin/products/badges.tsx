import { Icon } from "@/components/icons";

export function fmtTaka(paisa: number): string {
  return "৳" + (paisa / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });
}
export function discountPct(price: number, dp: number): number {
  return Math.round((1 - dp / price) * 100);
}

export function Thumb({ url }: { url?: string | null }) {
  if (url) {
    return (
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
      <Icon name="box" size={20} />
    </div>
  );
}

export function PriceDisplay({ price, discountPrice }: { price: number; discountPrice: number | null }) {
  if (!discountPrice) {
    return <span className="font-semibold text-stone-900">{fmtTaka(price)}</span>;
  }
  const pct = discountPct(price, discountPrice);
  return (
    <div className="flex flex-wrap items-baseline gap-1.5">
      <span className="font-semibold text-stone-900">{fmtTaka(discountPrice)}</span>
      <span className="text-[12px] text-stone-400 line-through">{fmtTaka(price)}</span>
      <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[11px] font-bold text-red-500">-{pct}%</span>
    </div>
  );
}

export function StockDisplay({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[12px] font-semibold text-red-600">
        Out of stock
      </span>
    );
  }
  if (stock < 10) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-semibold text-amber-600">
        Low · {stock}
      </span>
    );
  }
  return <span className="text-[14px] font-medium text-stone-700">{stock}</span>;
}

export function StatusPill({ status }: { status: "ACTIVE" | "INACTIVE" }) {
  const active = status === "ACTIVE";
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold",
        active ? "bg-brand-50 text-brand-700" : "bg-stone-100 text-stone-500",
      ].join(" ")}
    >
      <span className={"h-1.5 w-1.5 rounded-full " + (active ? "bg-brand-500" : "bg-stone-400")} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function PromoBadge({ label }: { label: string | null }) {
  if (!label) return null;
  return (
    <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">{label}</span>
  );
}
