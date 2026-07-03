"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { login, verifyTwoFactorLogin } from "./actions";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[14.5px] text-white placeholder:text-stone-500 outline-none transition focus:border-brand-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-brand-500/30";

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [twoFactor, setTwoFactor] = useState(false);
  const [pending, startTransition] = useTransition();

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
      if (result?.error) setError(result.error);
    });
  }

  if (twoFactor) {
    return (
      <form action={handleVerify} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-stone-300">
            Authentication code
          </label>
          <input
            name="code"
            required
            autoFocus
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            autoComplete="one-time-code"
            className={inputCls}
          />
          <p className="mt-1.5 text-[12px] text-stone-500">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>

        {error && (
          <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-[13px] font-medium text-red-300" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-brand-600 py-2.5 text-[14.5px] font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-500 disabled:opacity-50"
        >
          {pending ? "Verifying…" : "Verify"}
        </button>
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
