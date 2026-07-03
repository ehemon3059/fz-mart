"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { saveGoogleOAuthSettings } from "./actions";

interface Props {
  config: {
    clientId: string;
    redirectUri: string;
  } | null;
  /** Suggested redirect URI for first-time setup, derived from the request host. */
  defaultRedirectUri: string;
}

const inputCls =
  "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[14.5px] text-stone-900 placeholder:text-stone-400 shadow-soft focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
      <code className="block break-all px-3 py-2 font-mono text-[12px] leading-relaxed text-stone-700">
        {value}
      </code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="flex w-full items-center justify-center gap-1.5 border-t border-stone-200 bg-white py-1.5 text-[12px] font-semibold text-stone-600 hover:bg-stone-50"
      >
        {copied ? (
          <>
            <Icon name="check" size={13} strokeWidth={2.6} /> Copied
          </>
        ) : (
          "Copy"
        )}
      </button>
    </div>
  );
}

export default function GoogleOAuthForm({ config, defaultRedirectUri }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const redirectUri = config?.redirectUri || defaultRedirectUri;
  const origin = redirectUri.replace(/\/login\/google\/callback$/, "");

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await saveGoogleOAuthSettings(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* Form */}
      <form action={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-stone-900">OAuth credentials</h2>
              <p className="mt-0.5 text-[13px] text-stone-500">From your Google Cloud OAuth client.</p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                config ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${config ? "bg-emerald-500" : "bg-amber-500"}`} />
              {config ? "Configured" : "Not configured"}
            </span>
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Client ID</label>
              <input
                name="clientId"
                required
                defaultValue={config?.clientId}
                placeholder="xxxxx.apps.googleusercontent.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Client Secret</label>
              <input
                name="clientSecret"
                type="password"
                placeholder={config ? "Leave blank to keep current secret" : "GOCSPX-…"}
                className={inputCls}
              />
              {config && (
                <p className="mt-1.5 text-[12px] text-stone-400">
                  A secret is already saved. Leave this blank unless you&apos;re rotating it.
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">
                Authorized Redirect URI
              </label>
              <input
                name="redirectUri"
                required
                defaultValue={redirectUri}
                className={inputCls}
              />
              <p className="mt-1.5 text-[12px] text-stone-400">
                Must match an entry under &quot;Authorized redirect URIs&quot; in Google Cloud exactly, and
                end with <code className="rounded bg-stone-100 px-1 py-0.5">/login/google/callback</code>.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-600">
            {error}
          </p>
        )}
        {success && (
          <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13.5px] font-medium text-emerald-700">
            <Icon name="check" size={16} strokeWidth={2.4} /> Saved.
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-[14.5px] font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save credentials"}
        </button>
      </form>

      {/* Setup guide */}
      <aside className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6 lg:self-start">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Icon name="info" size={18} />
          </span>
          <div>
            <h2 className="text-[15px] font-bold text-stone-900">How to set up</h2>
            <p className="text-[12.5px] text-stone-500">One-time setup in Google Cloud</p>
          </div>
        </div>

        <ol className="mt-5 space-y-0">
          {[
            {
              title: "Open Google Cloud Credentials",
              body: (
                <>
                  Go to the{" "}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-brand-600 underline underline-offset-2"
                  >
                    Credentials page
                  </a>{" "}
                  and pick or create a project.
                </>
              ),
            },
            {
              title: "Configure consent screen",
              body: (
                <>
                  Set up the <b>OAuth consent screen</b> (External). Add your email as a test user, or
                  publish the app to go public.
                </>
              ),
            },
            {
              title: "Create OAuth client ID",
              body: (
                <>
                  <b>Create Credentials → OAuth client ID</b>, application type <b>Web application</b>.
                </>
              ),
            },
            {
              title: "Add JavaScript origin",
              body: (
                <>
                  Under <b>Authorized JavaScript origins</b>, add:
                  <div className="mt-2">
                    <CopyField value={origin} />
                  </div>
                </>
              ),
            },
            {
              title: "Add redirect URI",
              body: (
                <>
                  Under <b>Authorized redirect URIs</b>, add this exact value:
                  <div className="mt-2">
                    <CopyField value={redirectUri} />
                  </div>
                </>
              ),
            },
            {
              title: "Save credentials here",
              body: (
                <>
                  Click <b>Create</b>, then paste the <b>Client ID</b> and <b>Secret</b> into the form and
                  press <b>Save credentials</b>.
                </>
              ),
            },
          ].map((step, i, arr) => (
            <li key={i} className="flex gap-3.5">
              {/* Number + connector */}
              <div className="flex flex-col items-center">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[12px] font-bold text-white">
                  {i + 1}
                </span>
                {i < arr.length - 1 && <span className="w-px flex-1 bg-stone-200" />}
              </div>
              {/* Content */}
              <div className={i < arr.length - 1 ? "pb-5" : ""}>
                <p className="text-[13.5px] font-semibold text-stone-800">{step.title}</p>
                <div className="mt-1 text-[13px] leading-relaxed text-stone-500">{step.body}</div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-2 flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12.5px] leading-relaxed text-amber-800">
          <Icon name="warn" size={16} className="mt-px shrink-0 text-amber-500" />
          <p>
            The redirect URI must match Google <b>character-for-character</b> — <code>http</code> vs{" "}
            <code>https</code>, port, and trailing slash all matter, or login fails with{" "}
            <code>redirect_uri_mismatch</code>.
          </p>
        </div>
      </aside>
    </div>
  );
}
