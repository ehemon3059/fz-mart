import { MapPin, Truck, Clock, RotateCcw, PackageCheck, CircleAlert } from "lucide-react";
import { formatTaka } from "@/lib/money";

interface Zone {
  name: string;
  note: string;
  /** Paisa, or null when the store hasn't set a flat rate for the zone. */
  charge: number | null;
  eta: string;
}

interface Props {
  zones: Zone[];
  /** Paisa — order value above which delivery is free; null disables the row. */
  freeThreshold?: number | null;
  returnDays?: number;
}

export default function ShippingPanel({ zones, freeThreshold, returnDays = 7 }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* ── delivery ── */}
      <div>
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
          <Truck size={17} style={{ color: "var(--brand-dark)" }} /> Delivery
        </h3>

        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
          {zones.map((z, i) => (
            <div
              key={z.name}
              className={[
                "flex items-center justify-between gap-3 px-4 py-3",
                i > 0 ? "border-t border-slate-100" : "",
                i % 2 === 1 ? "bg-slate-50/60" : "bg-white",
              ].join(" ")}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-slate-800">
                  <MapPin size={13} className="shrink-0 text-slate-400" />
                  {z.name}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-slate-500">
                  <Clock size={12} className="shrink-0" />
                  {z.eta}
                  {z.note && <span className="text-slate-400">· {z.note}</span>}
                </p>
              </div>
              <span className="shrink-0 text-[14px] font-bold tabular-nums text-slate-900">
                {z.charge == null ? "—" : z.charge === 0 ? "Free" : formatTaka(z.charge)}
              </span>
            </div>
          ))}
        </div>

        {freeThreshold != null && freeThreshold > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-[12.5px] text-emerald-800 ring-1 ring-emerald-200">
            <PackageCheck size={15} className="mt-px shrink-0" />
            <span>
              <strong className="font-bold">Free delivery</strong> on orders over{" "}
              {formatTaka(freeThreshold)}.
            </span>
          </p>
        )}

        <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
          Orders placed before 3 PM are dispatched the same day. You&apos;ll get an SMS with your
          tracking code once the courier collects the parcel.
        </p>
      </div>

      {/* ── returns ── */}
      <div>
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
          <RotateCcw size={17} style={{ color: "var(--brand-dark)" }} /> Returns &amp; Refunds
        </h3>

        <ul className="mt-3 space-y-2.5">
          {[
            `${returnDays}-day easy return on unused items in their original packaging.`,
            "Wrong or damaged item? We replace it at no cost to you.",
            "Refunds are issued to bKash / Nagad within 3–5 working days of the item reaching us.",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-slate-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--brand)" }} />
              {line}
            </li>
          ))}
        </ul>

        <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-amber-800 ring-1 ring-amber-200">
          <CircleAlert size={15} className="mt-px shrink-0" />
          <span>
            Please record an unboxing video — it&apos;s required for damage and wrong-item claims.
          </span>
        </p>
      </div>
    </div>
  );
}
