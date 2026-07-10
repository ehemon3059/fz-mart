"use client";

import { useState, useTransition } from "react";
import {
  startTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactorSetup,
  generateBackupCodesAction,
} from "./actions";

const codeInput =
  "w-40 rounded-lg border border-stone-300 px-3 py-2 text-center text-lg tracking-[0.3em] outline-none focus:border-stone-900";

/** "9 Jul 2026, 2:14 PM" — falls back to the raw value if unparseable. */
function formatUsedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TwoFactorPanel({
  enabled,
  unusedBackupCodes,
  usedBackupCodes,
  totalBackupCodes,
  usedBackupCodeList,
}: {
  enabled: boolean;
  unusedBackupCodes: number;
  usedBackupCodes: number;
  totalBackupCodes: number;
  /** Used backup codes, newest first. `code` is null for pre-encryption codes. */
  usedBackupCodeList: { code: string | null; usedAt: string }[];
}) {
  const [setup, setSetup] = useState<{ secret: string; uri: string; qrSvg?: string } | null>(
    null,
  );
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupPending, startBackupTransition] = useTransition();
  const [remaining, setRemaining] = useState(unusedBackupCodes);
  const [used, setUsed] = useState(usedBackupCodes);
  const [total, setTotal] = useState(totalBackupCodes);
  const [usedList, setUsedList] = useState(usedBackupCodeList);

  function regenerateBackupCodes() {
    setBackupError(null);
    startBackupTransition(async () => {
      const res = await generateBackupCodesAction();
      if (res.error) setBackupError(res.error);
      else if (res.codes) {
        setBackupCodes(res.codes);
        // A fresh set replaces the old one: all available, none used yet.
        setRemaining(res.codes.length);
        setTotal(res.codes.length);
        setUsed(0);
        setUsedList([]);
      }
    });
  }

  function downloadCodes(codes: string[]) {
    const body =
      "FZ Mart — admin backup codes\n" +
      "Each code works once. Keep them somewhere safe.\n\n" +
      codes.join("\n") +
      "\n";
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "fz-mart-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function begin() {
    setMessage(null);
    startTransition(async () => {
      const res = await startTwoFactorSetup();
      if (res.error) setMessage({ type: "err", text: res.error });
      else if (res.secret && res.uri)
        setSetup({ secret: res.secret, uri: res.uri, qrSvg: res.qrSvg });
    });
  }

  function confirm(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const res = await confirmTwoFactorSetup(formData);
      if (res.error) setMessage({ type: "err", text: res.error });
      else {
        setSetup(null);
        setMessage({ type: "ok", text: res.success ?? "Enabled." });
      }
    });
  }

  function disable(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const res = await disableTwoFactorSetup(formData);
      if (res.error) setMessage({ type: "err", text: res.error });
      else setMessage({ type: "ok", text: res.success ?? "Disabled." });
    });
  }

  return (
    <div className="space-y-4">
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

      {enabled ? (
        <>
          <form action={disable} className="space-y-3">
            <p className="text-sm text-green-700">
              Two-factor authentication is <strong>enabled</strong> on your account.
            </p>
            <p className="text-sm text-stone-600">
              To turn it off, enter a current 6-digit code from your authenticator — or one of your
              backup codes:
            </p>
            <div className="flex items-center gap-3">
              <input
                name="code"
                required
                maxLength={9}
                autoCapitalize="characters"
                autoComplete="one-time-code"
                placeholder="123456 or 4F7K-9XQ2"
                className="w-56 rounded-lg border border-stone-300 px-3 py-2 text-center text-lg uppercase tracking-[0.2em] outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-stone-400 focus:border-stone-900"
              />
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Disable 2FA
              </button>
            </div>
          </form>

          <div className="border-t border-stone-200 pt-4">
            <h3 className="text-sm font-semibold text-stone-800">Backup codes</h3>
            <p className="mt-1 text-sm text-stone-600">
              Use a backup code to sign in if you lose access to your authenticator app. Each code
              works once.
            </p>

            {backupCodes ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-[13px] font-semibold text-amber-800">
                  Save these codes now — they won&apos;t be shown again.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-sm text-stone-800 sm:grid-cols-3">
                  {backupCodes.map((c) => (
                    <span key={c} className="rounded bg-white px-2 py-1 text-center">{c}</span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => downloadCodes(backupCodes)}
                    className="rounded-lg bg-stone-900 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-stone-800"
                  >
                    Download as .txt
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackupCodes(null)}
                    className="text-[13px] font-medium text-stone-600 underline"
                  >
                    I&apos;ve saved these codes
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {total > 0 ? (
                  <p className="text-sm text-stone-500">
                    {remaining} unused backup code{remaining === 1 ? "" : "s"} remaining.{" "}
                    <span className="text-stone-400">
                      ({used} of {total} used)
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-stone-500">No backup codes generated yet.</p>
                )}

                {usedList.length > 0 && (
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-stone-400">
                      Used codes
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {usedList.map((entry, i) => (
                        <li
                          key={(entry.code ?? "") + entry.usedAt + i}
                          className="flex items-center justify-between gap-3 text-[13px] text-stone-600"
                        >
                          {entry.code ? (
                            <span className="font-mono font-semibold text-stone-800 line-through decoration-stone-400">
                              {entry.code}
                            </span>
                          ) : (
                            <span className="font-mono text-stone-400">Code #{i + 1}</span>
                          )}
                          <span className="text-stone-500">used {formatUsedAt(entry.usedAt)}</span>
                        </li>
                      ))}
                    </ul>
                    {usedList.some((e) => e.code === null) && (
                      <p className="mt-2 text-[11.5px] text-stone-400">
                        Codes generated before this feature don&apos;t have a stored value — generate
                        a new set to see values here.
                      </p>
                    )}
                  </div>
                )}
                {backupError && <p className="text-sm text-red-600">{backupError}</p>}
                <button
                  type="button"
                  onClick={regenerateBackupCodes}
                  disabled={backupPending}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  {backupPending
                    ? "Generating…"
                    : remaining > 0
                      ? "Generate new codes"
                      : "Generate backup codes"}
                </button>
                {remaining > 0 && (
                  <p className="text-[12px] text-stone-400">
                    Generating new codes invalidates any existing unused codes.
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      ) : setup ? (
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            Scan this QR code with your authenticator app (Google Authenticator, Authy,
            1Password…), or enter the key manually, then confirm with a code.
          </p>
          {setup.qrSvg && (
            <div className="flex justify-center">
              {/* Self-generated SVG (lib/qr) — no external/user markup. */}
              <img
                src={`data:image/svg+xml;utf8,${encodeURIComponent(setup.qrSvg)}`}
                alt="Two-factor authentication QR code"
                width={240}
                height={240}
                className="rounded-lg border border-stone-200 bg-white p-2"
              />
            </div>
          )}
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-stone-400">
              Secret key
            </p>
            <p className="mt-1 break-all font-mono text-sm text-stone-800">{setup.secret}</p>
            <p className="mt-3 text-[12px] font-semibold uppercase tracking-wide text-stone-400">otpauth URI</p>
            <p className="mt-1 break-all font-mono text-[12px] text-stone-500">{setup.uri}</p>
          </div>
          <form action={confirm} className="flex items-center gap-3">
            <input name="code" required autoFocus inputMode="numeric" maxLength={6} placeholder="123456" className={codeInput} />
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Confirm &amp; enable
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-stone-600">
            Add a second layer of security — a 6-digit code from your phone at sign-in.
          </p>
          <button
            type="button"
            onClick={begin}
            disabled={pending}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Set up two-factor authentication
          </button>
        </div>
      )}
    </div>
  );
}
