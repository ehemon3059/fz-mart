"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { requestPasswordReset } from "./actions";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[14.5px] text-white placeholder:text-stone-500 outline-none transition focus:border-brand-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-brand-500/30";

export default function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await requestPasswordReset(formData);
      if (result?.error) setError(result.error);
      else if (result?.sent) setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-[14px] font-semibold text-emerald-300">Check your inbox</p>
          <p className="mt-1 text-[13px] leading-relaxed text-emerald-200/80">
            If that email is linked to an admin account, a password-reset link is on its way.
            It expires in 30 minutes.
          </p>
        </div>
        <Link
          href="/admin/login"
          className="block w-full rounded-xl bg-brand-600 py-2.5 text-center text-[14.5px] font-semibold text-white transition hover:bg-brand-500"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-stone-300">Email address</label>
        <input
          name="email"
          type="email"
          required
          autoFocus
          placeholder="you@example.com"
          className={inputCls}
        />
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
        {pending ? "Sending link…" : "Send reset link"}
      </button>
    </form>
  );
}
