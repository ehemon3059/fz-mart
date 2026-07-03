"use client";

import { useState, useTransition } from "react";
import { resetPassword } from "./actions";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[14.5px] text-white placeholder:text-stone-500 outline-none transition focus:border-brand-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-brand-500/30";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await resetPassword(token, formData);
      if (result?.error) setError(result.error);
      // success → server redirects to /admin/login
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-stone-300">New password</label>
        <input
          name="password"
          type="password"
          required
          autoFocus
          minLength={8}
          placeholder="At least 8 characters"
          className={inputCls}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-stone-300">Confirm new password</label>
        <input
          name="confirm"
          type="password"
          required
          minLength={8}
          placeholder="Re-enter your new password"
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
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
