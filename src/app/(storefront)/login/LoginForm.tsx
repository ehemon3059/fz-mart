"use client";

import { useState, useTransition } from "react";
import { requestMagicLink } from "./actions";

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export default function LoginForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    const email = String(formData.get("email") ?? "");
    startTransition(async () => {
      const result = await requestMagicLink(formData);
      if (result?.error) setError(result.error);
      else if (result?.sent) setSentTo(email);
    });
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "var(--brand-tint)", color: "var(--brand-dark)" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        </div>
        <h1 className="text-[20px] font-extrabold tracking-tight text-stone-900">Check your inbox</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-stone-500">
          We sent a sign-in link to{" "}
          <span className="font-semibold text-stone-800">{sentTo}</span>. It expires in 15 minutes
          and can only be used once.
        </p>
        <button
          type="button"
          onClick={() => setSentTo(null)}
          className="mt-6 text-[13px] font-semibold transition"
          style={{ color: "var(--brand-dark)" }}
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center">
        <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900">
          Sign in to fz-mart
        </h1>
        <p className="mt-1.5 text-[14px] text-stone-500">
          No password needed — continue with Google or an email link.
        </p>
      </div>

      <div className="mt-7 space-y-5">
        <a
          href={`/login/google?next=${encodeURIComponent(next)}`}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-stone-300 bg-white py-2.5 text-[14px] font-semibold text-stone-700 transition hover:bg-stone-50 hover:shadow-soft"
        >
          <GoogleLogo />
          Continue with Google
        </a>

        <div className="flex items-center gap-3 text-[12px] font-medium text-stone-400">
          <div className="h-px flex-1 bg-stone-200" />
          OR
          <div className="h-px flex-1 bg-stone-200" />
        </div>

        <form action={handleSubmit} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </span>
            <input
              name="email"
              type="email"
              required
              autoFocus
              placeholder="you@example.com"
              aria-label="Email address"
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--brand)";
                e.currentTarget.style.boxShadow = "0 0 0 4px var(--brand-tint)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "";
                e.currentTarget.style.boxShadow = "";
              }}
              className="w-full rounded-lg border border-stone-300 py-2.5 pl-10 pr-3 text-[14px] outline-none transition"
            />
          </div>

          {error && (
            <p className="text-[13px] font-medium text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="btn-brand-solid flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[14px] font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Sending…
              </>
            ) : (
              "Send sign-in link"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
