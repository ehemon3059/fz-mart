"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { login, verifyTwoFactorLogin } from "./actions";

/** "1:59" from a seconds count. */
function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[14.5px] text-white placeholder:text-stone-500 outline-none transition focus:border-brand-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-brand-500/30";

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [twoFactor, setTwoFactor] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);
  const [pending, startTransition] = useTransition();

  // Tick the lockout countdown down to zero, then clear the block.
  useEffect(() => {
    if (lockSeconds <= 0) return;
    const id = setInterval(() => {
      setLockSeconds((s) => {
        if (s <= 1) {
          clearInterval(id);
          setError(null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [lockSeconds]);

  const lockedOut = lockSeconds > 0;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await login(formData);
      if (result?.twoFactorRequired) setTwoFactor(true);
      else if (result?.error) setError(result.error);
    });
  }

  function handleVerify(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await verifyTwoFactorLogin(formData);
      if (result?.retryAfterSeconds) setLockSeconds(result.retryAfterSeconds);
      if (result?.error) setError(result.error);
    });
  }

  if (twoFactor) {
    return (
      <form action={handleVerify} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-stone-300">
            {useBackupCode ? "Backup code" : "Authentication code"}
          </label>
          {useBackupCode ? (
            <input
              name="code"
              required
              autoFocus
              disabled={lockedOut}
              placeholder="4F7K-9XQ2"
              autoCapitalize="characters"
              autoComplete="one-time-code"
              className={inputCls}
            />
          ) : (
            <input
              name="code"
              required
              autoFocus
              disabled={lockedOut}
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              autoComplete="one-time-code"
              className={inputCls}
            />
          )}
          <p className="mt-1.5 text-[12px] text-stone-500">
            {useBackupCode
              ? "Enter one of the backup codes you saved when you set up two-factor. Each code works once."
              : "Enter the 6-digit code from your authenticator app."}
          </p>
        </div>

        {lockedOut ? (
          <div
            className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-2.5 text-[13px] font-medium text-amber-200"
            role="alert"
          >
            Too many attempts. Try again in{" "}
            <span className="font-mono font-semibold tabular-nums">
              {formatCountdown(lockSeconds)}
            </span>
            . When the timer ends you can enter a backup code instead.
          </div>
        ) : (
          error && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-[13px] font-medium text-red-300" role="alert">
              {error}
            </p>
          )
        )}

        <button
          type="submit"
          disabled={pending || lockedOut}
          className="w-full rounded-xl bg-brand-600 py-2.5 text-[14.5px] font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-500 disabled:opacity-50"
        >
          {lockedOut
            ? `Wait ${formatCountdown(lockSeconds)}`
            : pending
              ? "Verifying…"
              : "Verify"}
        </button>

        <p className="text-center text-[13px] text-stone-400">
          {useBackupCode ? (
            <>
              Have your authenticator?{" "}
              <button
                type="button"
                onClick={() => { setUseBackupCode(false); setError(null); }}
                className="font-medium text-brand-400 hover:text-brand-300"
              >
                Use authentication code
              </button>
            </>
          ) : (
            <>
              No access to your authenticator?{" "}
              <button
                type="button"
                onClick={() => { setUseBackupCode(true); setError(null); }}
                className="font-medium text-brand-400 hover:text-brand-300"
              >
                Use a backup code
              </button>
            </>
          )}
        </p>
      </form>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-stone-300">Username</label>
        <input name="username" required autoFocus placeholder="admin" className={inputCls} />
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="block text-[13px] font-semibold text-stone-300">Password</label>
          <Link
            href="/admin/forgot-password"
            className="text-[12.5px] font-medium text-brand-400 hover:text-brand-300"
          >
            Forgot?
          </Link>
        </div>
        <input
          name="password"
          type="password"
          required
          placeholder="••••••••"
          className={inputCls}
        />
      </div>

      {error && (
        <p
          className="rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-[13px] font-medium text-red-300"
          role="alert"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand-600 py-2.5 text-[14.5px] font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-500 disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
