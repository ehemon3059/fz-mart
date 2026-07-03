"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { formatTaka } from "@/lib/money";
import { approveReturnAction, rejectReturnAction } from "./actions";

interface Props {
  id: number;
  orderNo: string;
  customer: string;
  phone: string;
  total: number;
  reason: string;
  photoUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  adminNote: string | null;
}

const badge: Record<Props["status"], string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function ReturnRow(props: Props) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function act(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/admin/orders`} className="font-mono font-semibold text-stone-800">
            {props.orderNo}
          </Link>
          <p className="text-[13px] text-stone-500">
            {props.customer} · {props.phone} · {formatTaka(props.total)}
          </p>
          <p className="text-[12px] text-stone-400">{props.createdAt}</p>
        </div>
        <span className={`rounded px-2 py-0.5 text-[12px] font-medium ${badge[props.status]}`}>
          {props.status}
        </span>
      </div>

      <p className="mt-3 whitespace-pre-line text-sm text-stone-700">{props.reason}</p>
      {props.photoUrl && (
        <a href={props.photoUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[13px] text-blue-600 underline">
          View attached photo
        </a>
      )}
      {props.adminNote && (
        <p className="mt-2 text-[13px] text-stone-500">
          <span className="font-medium">Admin note:</span> {props.adminNote}
        </p>
      )}

      {props.status === "PENDING" && (
        <div className="mt-4 space-y-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note (visible in the log)…"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => act(() => approveReturnAction(props.id, note))}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Approve &amp; mark returned
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => act(() => rejectReturnAction(props.id, note))}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
