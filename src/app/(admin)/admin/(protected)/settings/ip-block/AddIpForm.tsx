"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { addBlockedIp } from "./actions";
import type { IpBlockCopy } from "./content";

export default function AddIpForm({ t }: { t: IpBlockCopy["addForm"] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addBlockedIp(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setIp("");
        setReason("");
      }
    });
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
      <h2 className="text-[15px] font-bold text-stone-800">{t.heading}</h2>
      <p className="mt-1 text-[13px] text-stone-400">{t.subtitle}</p>

      <form action={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
        <input
          name="ip"
          required
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          placeholder={t.ipPlaceholder}
          className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-[14px] text-stone-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:flex-1"
        />
        <input
          name="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t.reasonPlaceholder}
          className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-[14px] text-stone-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:flex-1"
        />
        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-brand-600 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 sm:w-auto"
        >
          <Icon name="ban" size={16} />
          {pending ? t.blocking : t.block}
        </button>
      </form>
      {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
    </div>
  );
}
