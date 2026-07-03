"use client";

import { useState, useTransition } from "react";
import {
  startTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactorSetup,
} from "./actions";

const codeInput =
  "w-40 rounded-lg border border-stone-300 px-3 py-2 text-center text-lg tracking-[0.3em] outline-none focus:border-stone-900";

export default function TwoFactorPanel({ enabled }: { enabled: boolean }) {
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function begin() {
    setMessage(null);
    startTransition(async () => {
      const res = await startTwoFactorSetup();
      if (res.error) setMessage({ type: "err", text: res.error });
      else if (res.secret && res.uri) setSetup({ secret: res.secret, uri: res.uri });
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
        <form action={disable} className="space-y-3">
          <p className="text-sm text-green-700">
            Two-factor authentication is <strong>enabled</strong> on your account.
          </p>
          <p className="text-sm text-stone-600">To turn it off, enter a current code:</p>
          <div className="flex items-center gap-3">
            <input name="code" required inputMode="numeric" maxLength={6} placeholder="123456" className={codeInput} />
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Disable 2FA
            </button>
          </div>
        </form>
      ) : setup ? (
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            Add this account to your authenticator app (Google Authenticator, Authy, 1Password…).
            Scan the QR from the URI below, or enter the key manually, then confirm with a code.
          </p>
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-stone-400">Secret key</p>
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
