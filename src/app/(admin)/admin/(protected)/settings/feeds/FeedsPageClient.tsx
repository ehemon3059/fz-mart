"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import FeedsPanel from "./FeedsPanel";
import { buildCopy, type FeedsCopy, type FeedsLang } from "./content";

interface Props {
  baseUrl: string;
  initialToken: string;
  isLocalhost: boolean;
}

export default function FeedsPageClient({ baseUrl, initialToken, isLocalhost }: Props) {
  const [lang, setLang] = useState<FeedsLang>("en");

  const appearanceLink = (
    <Link
      href="/admin/settings/appearance"
      className="font-semibold underline underline-offset-2 hover:text-amber-950"
    >
      Settings → Appearance → Site URL
    </Link>
  );

  const t = buildCopy(lang, appearanceLink);

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-8 pb-28 sm:px-7 lg:pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
            {t.heading}
          </h1>
          <p className="mt-1 text-[13.5px] text-stone-500 sm:text-[14.5px]">{t.intro}</p>
        </div>

        <button
          type="button"
          onClick={() => setLang((l) => (l === "en" ? "bn" : "en"))}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-stone-700 shadow-soft hover:bg-stone-50"
        >
          <Icon name="globe" size={15} />
          {t.toggleLabel}
        </button>
      </div>

      <div className="mt-6 space-y-6">
        {isLocalhost && <LocalhostWarning t={t.localhost} />}
        <AboutCard t={t.about} />
        <FeedsPanel baseUrl={baseUrl} initialToken={initialToken} t={t.panel} />
      </div>
    </div>
  );
}

function LocalhostWarning({ t }: { t: FeedsCopy["localhost"] }) {
  return (
    <div className="max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
          <Icon name="warn" size={15} />
        </span>
        <div className="text-[13px] leading-relaxed text-amber-900">
          <p className="font-bold">{t.title}</p>
          <p className="mt-1 text-amber-800">{t.body}</p>
        </div>
      </div>
    </div>
  );
}

function AboutCard({ t }: { t: FeedsCopy["about"] }) {
  return (
    <div className="max-w-2xl rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-900 text-white">
          <Icon name="info" size={16} />
        </span>
        <div>
          <h2 className="text-[15px] font-bold text-stone-900">{t.heading}</h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-stone-600">{t.body}</p>
        </div>
      </div>

      <div className="mt-5 border-t border-stone-100 pt-4">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-stone-400">{t.whyHeading}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {t.benefits.map((b) => (
            <div key={b.title} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
              <p className="text-[13px] font-semibold text-stone-800">{b.title}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-stone-500">{b.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-stone-100 pt-4">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-stone-400">{t.howHeading}</h3>
        <ol className="mt-3 space-y-2">
          {t.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13.5px] text-stone-700">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-900 text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 flex items-start gap-1.5 text-[12.5px] text-stone-400">
          <Icon name="shield" size={13} className="mt-0.5 shrink-0" />
          {t.tokenNote}
        </p>
      </div>
    </div>
  );
}
