import { Truck, Wallet, RotateCcw, ShieldCheck } from "lucide-react";

/**
 * 2×2 reassurance grid under the buy box. Copy is deliberately concrete
 * (named cities, day counts, payment brands) — vague promises don't convert.
 */
const ITEMS = [
  {
    Icon: Truck,
    title: "Fast Delivery",
    sub: "Dhaka 1–2 days · Outside 2–4 days",
  },
  {
    Icon: Wallet,
    title: "Cash on Delivery",
    sub: "Or pay with bKash / Nagad",
  },
  {
    Icon: RotateCcw,
    title: "7 Days Easy Return",
    sub: "Unused, in original packaging",
  },
  {
    Icon: ShieldCheck,
    title: "Official Warranty",
    sub: "100% authentic products",
  },
] as const;

export default function TrustGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {ITEMS.map(({ Icon, title, sub }) => (
        <div
          key={title}
          className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition hover:border-slate-300 hover:bg-white hover:shadow-sm"
        >
          {/* brand-dark on the pale brand tint — readable across every palette
              preset, including the gold gradient where plain --brand washes out */}
          <span
            className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg"
            style={{ background: "var(--brand-tint)", color: "var(--brand-dark)" }}
          >
            <Icon size={16} strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <p className="text-[12.5px] font-bold leading-tight text-slate-800">{title}</p>
            <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
