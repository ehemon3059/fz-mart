"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { saveProfile } from "../actions";

interface Props {
  customerId: string;
  /** Sign-in identity — displayed, never editable. */
  loginEmail: string;
  provider: string;
  initial: { name: string; phone: string; contactEmail: string };
}

export default function ProfileForm({ customerId, loginEmail, provider, initial }: Props) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveProfile(formData);
      if (result?.error) setError(result.error);
      else setSaved(true);
    });
  }

  const field =
    "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";
  const label = "mb-1.5 block text-sm font-semibold text-gray-700";

  return (
    <form action={handleSubmit} className="max-w-xl">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-gray-900">Personal details</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          We use these to contact you about your orders.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="name" className={label}>
              Full name
            </label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              maxLength={80}
              placeholder="Your name"
              className={field}
            />
          </div>

          <div>
            <label htmlFor="phone" className={label}>
              Mobile number
            </label>
            <input
              id="phone"
              name="phone"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 11))}
              inputMode="numeric"
              placeholder="017XXXXXXXX"
              className={field}
            />
            <p className="mt-1 text-xs text-gray-400">11 digits, starting with 01.</p>
          </div>

          {/* Sign-in email: shown for reference, deliberately not editable —
              it is the identity behind magic links and Google sign-in. */}
          <div>
            <span className={label}>Sign-in email</span>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5">
              <span className="text-sm text-gray-700">{loginEmail}</span>
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                {provider === "GOOGLE" ? "Google" : "Email link"}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              This is how you sign in, so it can&apos;t be changed. Add a contact email below if you
              want us to reach you somewhere else.
            </p>
          </div>

          <div>
            <label htmlFor="contactEmail" className={label}>
              Contact email <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={(e) => set("contactEmail", e.target.value)}
              placeholder="you@example.com"
              className={field}
            />
          </div>

          <div>
            <span className={label}>Customer ID</span>
            <p className="font-mono text-sm text-gray-500">{customerId}</p>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </p>
        )}
        {saved && (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            Profile saved.
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          <Link href="/account/addresses" className="text-sm font-semibold text-brand-700 hover:underline">
            Manage delivery addresses →
          </Link>
        </div>
      </div>
    </form>
  );
}
