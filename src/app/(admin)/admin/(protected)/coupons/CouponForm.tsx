"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CouponType } from "@prisma/client";
import { saveCoupon } from "./actions";

interface CouponData {
  id: number;
  code: string;
  type: CouponType;
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  startsAt: string | null; // yyyy-mm-dd
  endsAt: string | null;
  isActive: boolean;
}

const input = "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900";
const label = "mb-1 block text-[13px] font-semibold text-stone-700";

export default function CouponForm({ coupon }: { coupon?: CouponData }) {
  const router = useRouter();
  const isEdit = !!coupon;
  const [type, setType] = useState<CouponType>(coupon?.type ?? "PERCENT");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await saveCoupon(coupon?.id ?? null, formData);
      if (res?.error) setError(res.error);
      else router.push("/admin/coupons");
    });
  }

  // Paisa → taka for the money inputs (value only when FIXED).
  const taka = (p: number | null | undefined) => (p == null ? "" : String(p / 100));

  return (
    <form action={handleSubmit} className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">{isEdit ? "Edit coupon" : "New coupon"}</h1>

      <div>
        <label className={label}>Code</label>
        <input name="code" required defaultValue={coupon?.code} placeholder="EID25" className={`${input} uppercase`} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Type</label>
          <select name="type" value={type} onChange={(e) => setType(e.target.value as CouponType)} className={input}>
            <option value="PERCENT">Percentage (%)</option>
            <option value="FIXED">Fixed amount (৳)</option>
          </select>
        </div>
        <div>
          <label className={label}>{type === "PERCENT" ? "Percent off" : "Amount off (৳)"}</label>
          <input
            name="value"
            required
            inputMode="decimal"
            defaultValue={coupon ? (coupon.type === "FIXED" ? taka(coupon.value) : String(coupon.value)) : ""}
            placeholder={type === "PERCENT" ? "25" : "200"}
            className={input}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Min order (৳)</label>
          <input name="minOrder" inputMode="decimal" defaultValue={taka(coupon?.minOrder)} placeholder="0" className={input} />
        </div>
        <div>
          <label className={label}>Max discount (৳){type === "FIXED" ? " — n/a" : ""}</label>
          <input name="maxDiscount" inputMode="decimal" defaultValue={taka(coupon?.maxDiscount)} placeholder="cap for %" className={input} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Total usage limit</label>
          <input name="usageLimit" inputMode="numeric" defaultValue={coupon?.usageLimit ?? ""} placeholder="unlimited" className={input} />
        </div>
        <div>
          <label className={label}>Per-customer limit</label>
          <input name="perCustomerLimit" inputMode="numeric" defaultValue={coupon?.perCustomerLimit ?? ""} placeholder="unlimited" className={input} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Starts (optional)</label>
          <input type="date" name="startsAt" defaultValue={coupon?.startsAt ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Ends (optional)</label>
          <input type="date" name="endsAt" defaultValue={coupon?.endsAt ?? ""} className={input} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input type="checkbox" name="isActive" defaultChecked={coupon?.isActive ?? true} />
        Active
      </label>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-stone-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create coupon"}
        </button>
        <Link href="/admin/coupons" className="rounded-lg border border-stone-300 px-5 py-2 text-sm font-semibold text-stone-700">
          Cancel
        </Link>
      </div>
    </form>
  );
}
