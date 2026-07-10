"use client";

import { useState, useTransition } from "react";
import { saveCompanyInfoAction } from "./actions";
import type { CompanyInfo } from "@/server/settings/company";

const input = "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900";
const label = "mb-1 block text-[13px] font-semibold text-stone-700";

export default function CompanyInfoForm({ initial }: { initial: CompanyInfo }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const result = await saveCompanyInfoAction(formData);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <form action={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-stone-200 bg-white p-5 shadow-soft">
      <div>
        <h2 className="text-[15px] font-bold text-stone-800">Company info</h2>
        <p className="mt-1 text-[13px] text-stone-400">
          Shown in the storefront footer. Leave a field blank to hide it.
        </p>
      </div>

      <div>
        <label className={label}>Description</label>
        <textarea
          name="description"
          defaultValue={initial.description}
          rows={2}
          placeholder="A short line about your store, shown under the logo in the footer."
          className={input}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Address</label>
          <input name="address" defaultValue={initial.address} placeholder="Rampura, Dhaka, Bangladesh" className={input} />
        </div>
        <div>
          <label className={label}>Phone</label>
          <input name="phone" defaultValue={initial.phone} placeholder="8801XXXXXXXXX" className={input} />
        </div>
        <div>
          <label className={label}>Email</label>
          <input name="email" type="email" defaultValue={initial.email} placeholder="contact@yourstore.com" className={input} />
        </div>
        <div>
          <label className={label}>Footer copyright text</label>
          <input name="copyrightText" defaultValue={initial.copyrightText} placeholder="FZ Mart" className={input} />
          <p className="mt-1 text-[12px] text-stone-400">
            Shown as &ldquo;© {new Date().getFullYear()} {"{text}"}. All rights reserved.&rdquo;
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-[13px] font-semibold text-stone-700">Social links</h3>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Facebook URL</label>
            <input name="facebookUrl" defaultValue={initial.facebookUrl} placeholder="https://facebook.com/yourpage" className={input} />
          </div>
          <div>
            <label className={label}>Instagram URL</label>
            <input name="instagramUrl" defaultValue={initial.instagramUrl} placeholder="https://instagram.com/yourpage" className={input} />
          </div>
          <div>
            <label className={label}>YouTube URL</label>
            <input name="youtubeUrl" defaultValue={initial.youtubeUrl} placeholder="https://youtube.com/@yourpage" className={input} />
          </div>
          <div>
            <label className={label}>Twitter / X URL</label>
            <input name="twitterUrl" defaultValue={initial.twitterUrl} placeholder="https://x.com/yourpage" className={input} />
          </div>
        </div>
      </div>

      {error && <p className="text-[13px] font-medium text-red-600">{error}</p>}
      {saved && !error && <p className="text-[13px] font-medium text-brand-600">Saved.</p>}
      <button type="submit" disabled={pending} className="rounded-xl bg-brand-600 px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
        {pending ? "Saving…" : "Save company info"}
      </button>
    </form>
  );
}
