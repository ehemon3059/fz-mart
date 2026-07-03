"use client";

import Link from "next/link";
import { useTransition } from "react";
import { removeCoupon } from "./actions";

export default function CouponRow({
  id,
  code,
  summary,
  usage,
  status,
}: {
  id: number;
  code: string;
  summary: string;
  usage: string;
  status: { label: string; cls: string };
}) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className={pending ? "opacity-50" : ""}>
      <td className="px-4 py-3 font-mono font-semibold text-stone-800">{code}</td>
      <td className="px-4 py-3 text-stone-600">{summary}</td>
      <td className="px-4 py-3 text-stone-600">{usage}</td>
      <td className="px-4 py-3">
        <span className={`rounded px-2 py-0.5 text-[12px] font-medium ${status.cls}`}>{status.label}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <Link href={`/admin/coupons/${id}/edit`} className="mr-2 text-sm font-medium text-stone-700 underline">
          Edit
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Delete coupon ${code}?`)) {
              startTransition(async () => {
                await removeCoupon(id);
              });
            }
          }}
          className="text-sm font-medium text-red-600 underline disabled:opacity-50"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
