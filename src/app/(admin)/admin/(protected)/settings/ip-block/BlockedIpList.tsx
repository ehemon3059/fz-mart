"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { removeBlockedIp } from "./actions";

export interface BlockedIpRow {
  id: number;
  ip: string;
  reason: string | null;
  createdAt: string;
}

interface Props {
  initialRows: BlockedIpRow[];
}

export function BlockedIpList({ initialRows }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function unblock(id: number, ip: string) {
    setConfirmId(null);
    startTransition(async () => {
      const result = await removeBlockedIp(ip);
      if (!result?.error) {
        setRows((prev) => prev.filter((r) => r.id !== id));
      }
    });
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white py-16 text-center shadow-soft">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
          <Icon name="shield" size={28} />
        </div>
        <h3 className="mt-4 text-[15px] font-bold text-stone-800">No blocked IPs</h3>
        <p className="mt-1 text-[13.5px] text-stone-400">
          Addresses you block will show up here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-stone-200 bg-white shadow-soft md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50 text-left">
              {["IP Address", "Reason", "Blocked Since", ""].map((h, i) => (
                <th
                  key={i}
                  className="px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-wider text-stone-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-stone-100 last:border-0">
                <td className="px-5 py-3.5 font-mono text-[14px] text-stone-800">{row.ip}</td>
                <td className="px-5 py-3.5 text-[14px] text-stone-500">{row.reason ?? "—"}</td>
                <td className="px-5 py-3.5 text-[14px] text-stone-500">{row.createdAt}</td>
                <td className="px-5 py-3.5 text-right">
                  {confirmId === row.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => unblock(row.id, row.ip)}
                        disabled={pending}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="rounded-lg border border-stone-200 px-3 py-1.5 text-[12.5px] font-semibold text-stone-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(row.id)}
                      className="text-[13px] font-semibold text-red-600 hover:underline"
                    >
                      Unblock
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[14.5px] font-semibold text-stone-800">{row.ip}</p>
                <p className="mt-0.5 text-[13px] text-stone-400">{row.reason ?? "No reason given"}</p>
              </div>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
                <Icon name="ban" size={16} />
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3">
              <span className="text-[12.5px] text-stone-400">Blocked {row.createdAt}</span>
              {confirmId === row.id ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => unblock(row.id, row.ip)}
                    disabled={pending}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="rounded-lg border border-stone-200 px-3 py-1.5 text-[12.5px] font-semibold text-stone-600"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(row.id)}
                  className="text-[13px] font-semibold text-red-600 hover:underline"
                >
                  Unblock
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
