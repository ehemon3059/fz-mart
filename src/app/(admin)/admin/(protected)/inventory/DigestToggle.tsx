"use client";

import { useState, useTransition } from "react";
import { Toggle } from "@/components/admin/ui/Toggle";
import { setDigestEnabled, sendDigestNow } from "./actions";

/**
 * Daily low-stock digest control. Optimistic: the switch flips immediately and
 * reverts if the server rejects it, so a slow round-trip never leaves the UI
 * looking stuck.
 */
export default function DigestToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(next: boolean) {
    const previous = on;
    setOn(next);
    setNote(null);
    startTransition(async () => {
      const res = await setDigestEnabled(next);
      if (res.error) {
        setOn(previous);
        setNote(res.error);
      }
    });
  }

  function sendNow() {
    setNote(null);
    startTransition(async () => {
      const res = await sendDigestNow();
      setNote(res.error ?? res.success ?? null);
    });
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-card">
      <div className="flex items-center gap-3">
        <Toggle checked={on} onChange={toggle} disabled={pending} label="Daily low-stock digest" />
        <div className="text-[13px]">
          <p className="font-medium text-stone-800">Daily low-stock email</p>
          <p className="text-[11.5px] text-stone-500">Sent to every owner and manager.</p>
        </div>
        <button
          type="button"
          onClick={sendNow}
          disabled={pending || !on}
          className="ml-2 rounded-md border border-stone-300 px-2.5 py-1 text-[12px] font-medium text-stone-600 transition-colors hover:border-stone-400 disabled:opacity-40"
        >
          Send now
        </button>
      </div>
      {note && <p className="mt-2 text-[12px] text-stone-500">{note}</p>}
    </div>
  );
}
