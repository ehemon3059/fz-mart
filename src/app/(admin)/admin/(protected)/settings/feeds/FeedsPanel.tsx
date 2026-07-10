"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { regenerateFeedTokenAction } from "./actions";
import type { FeedsCopy } from "./content";

interface Props {
  baseUrl: string;
  initialToken: string;
  t: FeedsCopy["panel"];
}

function FeedRow({ label, url, t }: { label: string; url: string; t: FeedsCopy["panel"] }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <label className="mb-1 block text-[13px] font-semibold text-stone-700">{label}</label>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full truncate rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 font-mono text-[12.5px] text-stone-600"
        />
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(url).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="shrink-0 rounded-xl border border-stone-200 px-3 py-2 text-[13px] font-semibold text-stone-700 hover:bg-stone-50"
        >
          {copied ? t.copied : t.copy}
        </button>
      </div>
    </div>
  );
}

export default function FeedsPanel({ baseUrl, initialToken, t }: Props) {
  const [token, setToken] = useState(initialToken);
  const [pending, startTransition] = useTransition();

  const facebookUrl = `${baseUrl}/api/feeds/facebook?token=${token}`;
  const googleUrl = `${baseUrl}/api/feeds/google?token=${token}`;

  function regenerate() {
    if (!window.confirm(t.confirm)) {
      return;
    }
    startTransition(async () => {
      const result = await regenerateFeedTokenAction();
      if (result.token) setToken(result.token);
    });
  }

  return (
    <div className="max-w-2xl space-y-5 rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
      <FeedRow label={t.facebookLabel} url={facebookUrl} t={t} />
      <FeedRow label={t.googleLabel} url={googleUrl} t={t} />

      <div className="flex items-center justify-between border-t border-stone-100 pt-4">
        <p className="text-[12.5px] text-stone-400">{t.note}</p>
        <button
          type="button"
          onClick={regenerate}
          disabled={pending}
          className="ml-4 flex shrink-0 items-center gap-1.5 rounded-xl border border-stone-200 px-3.5 py-2 text-[13px] font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          <Icon name="settings" size={14} />
          {pending ? t.regenerating : t.regenerate}
        </button>
      </div>
    </div>
  );
}
