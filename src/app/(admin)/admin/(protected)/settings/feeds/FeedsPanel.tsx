"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { regenerateFeedTokenAction } from "./actions";

interface Props {
  baseUrl: string;
  initialToken: string;
}

function FeedRow({ label, url }: { label: string; url: string }) {
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
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export default function FeedsPanel({ baseUrl, initialToken }: Props) {
  const [token, setToken] = useState(initialToken);
  const [pending, startTransition] = useTransition();

  const facebookUrl = `${baseUrl}/api/feeds/facebook?token=${token}`;
  const googleUrl = `${baseUrl}/api/feeds/google?token=${token}`;

  function regenerate() {
    if (
      !window.confirm(
        "Regenerate the feed token? The old feed URLs will stop working and you must update them in Facebook / Google Merchant.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await regenerateFeedTokenAction();
      if (result.token) setToken(result.token);
    });
  }

  return (
    <div className="max-w-2xl space-y-5 rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
      <FeedRow label="Facebook Catalog (CSV)" url={facebookUrl} />
      <FeedRow label="Google Merchant (XML)" url={googleUrl} />

      <div className="flex items-center justify-between border-t border-stone-100 pt-4">
        <p className="text-[12.5px] text-stone-400">
          These URLs contain a secret token. Paste them into Facebook Commerce Manager and Google
          Merchant Center as scheduled feeds.
        </p>
        <button
          type="button"
          onClick={regenerate}
          disabled={pending}
          className="ml-4 flex shrink-0 items-center gap-1.5 rounded-xl border border-stone-200 px-3.5 py-2 text-[13px] font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          <Icon name="settings" size={14} />
          {pending ? "Regenerating…" : "Regenerate token"}
        </button>
      </div>
    </div>
  );
}
