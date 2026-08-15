"use client";

import { useState, useTransition } from "react";
import { Toggle } from "@/components/admin/ui/Toggle";
import { setDigestEnabled, sendDigestNow } from "./actions";

/**
 * Daily low-stock digest control. Optimistic: the switch flips immediately and
 * reverts if the server rejects it, so a slow round-trip never leaves the UI
 * looking stuck.
 */
export default function DigestToggle({
  enabled,
  labels,
}: {
  enabled: boolean;
  /** Translated copy, passed down so the toggle follows the page's language. */
  labels: { title: string; sub: string; send: string };
}) {
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
    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <Toggle checked={on} onChange={toggle} disabled={pending} label={labels.title} />
        <div className="text-[13px]">
          <p className="font-medium text-stone-800">{labels.title}</p>
          <p className="text-[11.5px] text-stone-500">{labels.sub}</p>
        </div>
        <button
          type="button"
          onClick={sendNow}
          disabled={pending || !on}
          className="ml-2 rounded-md border border-stone-300 px-2.5 py-1 text-[12px] font-medium text-stone-600 transition-colors hover:border-stone-400 disabled:opacity-40"
        >
          {labels.send}
        </button>
      </div>
      {note && <p className="mt-2 text-[12px] text-stone-500">{note}</p>}
    </div>
  );
}
