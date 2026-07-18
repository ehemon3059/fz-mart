"use client";

import { useState, useTransition } from "react";
import { ALL_ROLES, ROLE_LABELS, type AdminRole } from "@/lib/permissions";
import { inviteAdminAction, changeRoleAction, toggleActiveAction, deleteAdminAction } from "./actions";

/** Inline Tailwind spinner — a spinning ring sized to the current text. */
function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

interface AdminRow {
  id: number;
  username: string;
  email: string | null;
  role: AdminRole;
  isActive: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
}

export default function AdminsClient({
  admins,
  currentAdminId,
}: {
  admins: AdminRow[];
  currentAdminId: number;
}) {
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ error?: string; success?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setMessage({ type: "err", text: res.error });
      else if (res.success) setMessage({ type: "ok", text: res.success });
    });
  }

  return (
    <div className="space-y-6">
      {message && (
        <p
          className={`rounded-lg border px-4 py-2.5 text-sm ${
            message.type === "ok"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Invite */}
      <form
        action={(fd) => run(() => inviteAdminAction(fd))}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-5"
      >
        <div className="flex-1 min-w-[220px]">
          <label className="mb-1 block text-[13px] font-semibold text-stone-700">Invite by email</label>
          <input
            name="email"
            type="email"
            required
            placeholder="teammate@example.com"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-semibold text-stone-700">Role</label>
          <select
            name="role"
            defaultValue="STAFF"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending && <Spinner />}
          {pending ? "Sending…" : "Send invite"}
        </button>
      </form>

      {/* Admin list */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-[12px] uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">2FA</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {admins.map((a) => {
              const isSelf = a.id === currentAdminId;
              return (
                <tr key={a.id} className={a.isActive ? "" : "bg-stone-50/60 text-stone-400"}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-stone-800">{a.username}{isSelf && " (you)"}</div>
                    <div className="text-[12px] text-stone-400">{a.email ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      defaultValue={a.role}
                      disabled={pending || isSelf}
                      onChange={(e) => {
                        const fd = new FormData();
                        fd.set("role", e.target.value);
                        run(() => changeRoleAction(a.id, fd));
                      }}
                      className="rounded-lg border border-stone-300 px-2 py-1 text-[13px] outline-none disabled:opacity-60"
                    >
                      {ALL_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {a.twoFactorEnabled ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-[12px] font-medium text-green-700">On</span>
                    ) : (
                      <span className="text-[12px] text-stone-400">Off</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {a.isActive ? (
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-[12px] font-medium text-blue-700">Active</span>
                    ) : (
                      <span className="rounded bg-stone-200 px-2 py-0.5 text-[12px] font-medium text-stone-600">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!isSelf && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => toggleActiveAction(a.id, !a.isActive))}
                          className="rounded-lg border border-stone-300 px-3 py-1.5 text-[13px] font-medium hover:border-black disabled:opacity-50"
                        >
                          {a.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Permanently delete "${a.username}"? This can't be undone. To keep their history but block access, use Deactivate instead.`,
                              )
                            ) {
                              run(() => deleteAdminAction(a.id));
                            }
                          }}
                          className="rounded-lg border border-red-300 px-3 py-1.5 text-[13px] font-medium text-red-600 hover:border-red-500 hover:bg-red-50 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
