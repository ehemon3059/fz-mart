"use client";

import { useTransition } from "react";
import { Icon } from "@/components/icons";
import { createStockTakeAction } from "./actions";

const field =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-accent";
const label = "mb-1 block text-[12px] font-semibold text-stone-600";

export default function StartTakeForm({ locations }: { locations: { id: number; name: string }[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => {
        startTransition(async () => {
          await createStockTakeAction(fd);
        });
      }}
      className="rounded-lg border border-stone-200 bg-white p-5 shadow-card"
    >
      <h2 className="mb-3 text-[13px] font-semibold text-stone-900">Start a new count</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {locations.length > 0 && (
          <div>
            <label className={label}>Location</label>
            <select name="locationId" className={field} defaultValue="">
              <option value="">Whole shop</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className={locations.length > 0 ? "sm:col-span-2" : "sm:col-span-3"}>
          <label className={label}>Note</label>
          <input name="note" placeholder="Month-end count" className={field} />
        </div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        <Icon name="plus" size={14} />
        {pending ? "Starting…" : "Start counting"}
      </button>
    </form>
  );
}
