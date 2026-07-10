"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import AddIpForm from "./AddIpForm";
import { BlockedIpList, type BlockedIpRow } from "./BlockedIpList";
import { IP_BLOCK_COPY, type IpBlockLang } from "./content";

const CARD_ICONS = ["shield", "warn", "globe"] as const;

interface Props {
  rows: BlockedIpRow[];
  count: number;
}

export default function IpBlockPageClient({ rows, count }: Props) {
  const [lang, setLang] = useState<IpBlockLang>("en");
  const t = IP_BLOCK_COPY[lang];

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-8 pb-28 sm:px-7 lg:pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
            {t.heading}
          </h1>
          <p className="mt-1 text-[13.5px] text-stone-500 sm:text-[14.5px]">{t.subtitle(count)}</p>
        </div>

        <button
          type="button"
          onClick={() => setLang((l) => (l === "en" ? "bn" : "en"))}
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-stone-700 shadow-soft hover:bg-stone-50"
        >
          <Icon name="globe" size={15} />
          {t.toggleLabel}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {t.cards.map((card, i) => (
          <div key={i} className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon name={CARD_ICONS[i]} size={18} />
            </div>
            <h3 className="mt-3 text-[14.5px] font-bold text-stone-800">{card.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-stone-500">{card.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <AddIpForm t={t.addForm} />
      </div>

      <div className="mt-6">
        <BlockedIpList initialRows={rows} t={t.list} />
      </div>
    </div>
  );
}
