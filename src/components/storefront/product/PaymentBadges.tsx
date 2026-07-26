import { Banknote } from "lucide-react";

/**
 * Local payment-method reassurance. Wordmarks are set in type rather than
 * bitmap logos — no licensing question, and they stay crisp at any zoom.
 */
const METHODS = [
  { label: "Cash on Delivery", tint: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  { label: "bKash", tint: "bg-pink-50 text-pink-700 ring-pink-200" },
  { label: "Nagad", tint: "bg-orange-50 text-orange-700 ring-orange-200" },
  { label: "Card", tint: "bg-slate-50 text-slate-600 ring-slate-200" },
] as const;

export default function PaymentBadges() {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
      <span className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-slate-400">
        <Banknote size={14} /> Pay with
      </span>
      {METHODS.map((m) => (
        <span
          key={m.label}
          className={`rounded-md px-2 py-1 text-[11.5px] font-bold ring-1 ${m.tint}`}
        >
          {m.label}
        </span>
      ))}
    </div>
  );
}
