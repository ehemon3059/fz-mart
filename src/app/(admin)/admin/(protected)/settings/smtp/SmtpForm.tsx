"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { saveSmtpSettings } from "./actions";

interface Props {
  config: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    fromAddress: string;
    fromName: string;
  } | null;
}

const inputCls =
  "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[14.5px] text-stone-900 placeholder:text-stone-400 shadow-soft focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";
const labelCls = "mb-1.5 block text-[13px] font-semibold text-stone-700";

export default function SmtpForm({ config }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const configured = Boolean(config?.host);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await saveSmtpSettings(formData);
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
        {/* Server card */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-stone-900">Mail server</h2>
              <p className="mt-0.5 text-[13px] text-stone-500">Connection to your SMTP provider.</p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                configured ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${configured ? "bg-emerald-500" : "bg-amber-500"}`} />
              {configured ? "Configured" : "Not configured"}
            </span>
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <label className={labelCls}>SMTP Host</label>
              <input name="host" required defaultValue={config?.host} placeholder="smtp.gmail.com" className={inputCls} />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Port</label>
                <input name="port" type="number" required defaultValue={config?.port ?? 587} className={inputCls} />
              </div>
              <label className="flex cursor-pointer items-center gap-2.5 self-center pt-6 text-[14px] font-medium text-stone-700">
                <input
                  name="secure"
                  type="checkbox"
                  defaultChecked={config?.secure ?? false}
                  className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500/30"
                />
                Use TLS (port 465)
              </label>
            </div>

            <div>
              <label className={labelCls}>Username</label>
              <input name="user" defaultValue={config?.user} placeholder="you@gmail.com" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <input
                name="password"
                type="password"
                placeholder={config ? "Leave blank to keep current password" : "App password"}
                className={inputCls}
              />
              {configured && (
                <p className="mt-1.5 text-[12px] text-stone-400">
                  A password is already saved. Leave blank to keep it.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sender card */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-6">
          <h2 className="text-[15px] font-bold text-stone-900">Sender identity</h2>
          <p className="mt-0.5 text-[13px] text-stone-500">How emails appear in the customer&apos;s inbox.</p>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelCls}>From Address</label>
              <input
                name="fromAddress"
                required
                type="email"
                defaultValue={config?.fromAddress}
                placeholder="orders@fz-mart.example"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>From Name</label>
              <input name="fromName" defaultValue={config?.fromName ?? "fz-mart"} className={inputCls} />
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
          {pending ? "Saving…" : "Save settings"}
        </button>
      </form>

      {/* Info column */}
      <aside className="space-y-4 lg:self-start">
        {/* What is SMTP */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon name="info" size={18} />
            </span>
            <h2 className="text-[15px] font-bold text-stone-900">What is SMTP?</h2>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-stone-500">
            <b className="text-stone-700">SMTP</b> (Simple Mail Transfer Protocol) is the standard your store
            uses to hand outgoing emails — order confirmations and sign-in links — to a mail server that
            delivers them. Enter the credentials of any mail provider here and the store sends through it.
          </p>
          <div className="mt-3 flex gap-2.5 rounded-lg border border-stone-200 bg-stone-50 p-3 text-[12.5px] leading-relaxed text-stone-600">
            <Icon name="warn" size={16} className="mt-px shrink-0 text-stone-400" />
            <p>Emails only send while the background worker process is running.</p>
          </div>
        </div>

        {/* Gmail */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon name="externalLink" size={17} />
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-stone-900">Configure with Gmail</h2>
              <p className="text-[12.5px] text-stone-500">Good for testing & low volume</p>
            </div>
          </div>

          <ol className="mt-5 space-y-0">
            {[
              {
                title: "Enable 2-Step Verification",
                body: (
                  <>
                    In your{" "}
                    <a
                      href="https://myaccount.google.com/security"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand-600 underline underline-offset-2"
                    >
                      Google Account security
                    </a>{" "}
                    settings — required before you can create an app password.
                  </>
                ),
              },
              {
                title: "Create an App Password",
                body: (
                  <>
                    Go to{" "}
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand-600 underline underline-offset-2"
                    >
                      App passwords
                    </a>{" "}
                    and generate a 16-character password. Use this — <b>not</b> your normal login password.
                  </>
                ),
              },
              {
                title: "Fill in the form",
                body: (
                  <ul className="space-y-0.5">
                    <li>Host: <code className="rounded bg-stone-100 px-1 font-mono text-[12px]">smtp.gmail.com</code></li>
                    <li>Port: <code className="rounded bg-stone-100 px-1 font-mono text-[12px]">587</code>, TLS off</li>
                    <li>Username & From: your Gmail address</li>
                    <li>Password: the app password</li>
                  </ul>
                ),
              },
            ].map((step, i, arr) => (
              <li key={i} className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[12px] font-bold text-white">
                    {i + 1}
                  </span>
                  {i < arr.length - 1 && <span className="w-px flex-1 bg-stone-200" />}
                </div>
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
              The <b>From Address</b> must be your own Gmail address — Gmail rejects sending as a different
              address. Daily limit ≈ 500 emails.
            </p>
          </div>
        </div>

        {/* Own domain */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon name="settings" size={17} />
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-stone-900">Configure with your own domain</h2>
              <p className="text-[12.5px] text-stone-500">Recommended for production</p>
            </div>
          </div>

          <p className="mt-3 text-[13px] leading-relaxed text-stone-500">
            To send as <code className="rounded bg-stone-100 px-1 font-mono text-[12px]">orders@yourstore.com</code>,
            use the SMTP details from your email host. Two common options:
          </p>

          <div className="mt-3 space-y-2.5">
            <div className="rounded-lg border border-stone-200 p-3">
              <p className="text-[13px] font-semibold text-stone-800">Hosting / cPanel mailbox</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-stone-500">
                Create the mailbox in cPanel → Email Accounts → Connect Devices. Use the host (often{" "}
                <code className="rounded bg-stone-100 px-1 font-mono text-[12px]">mail.yourstore.com</code>),
                port <code className="rounded bg-stone-100 px-1 font-mono text-[12px]">465</code> with TLS on,
                and the full email + its password.
              </p>
            </div>
            <div className="rounded-lg border border-stone-200 p-3">
              <p className="text-[13px] font-semibold text-stone-800">Transactional service</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-stone-500">
                Providers like <b>Resend</b>, <b>SendGrid</b>, <b>Postmark</b>, or <b>Amazon SES</b> give you
                an SMTP host, username, and API-key password. Best deliverability at scale.
              </p>
            </div>
          </div>

          <div className="mt-3 flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12.5px] leading-relaxed text-amber-800">
            <Icon name="warn" size={16} className="mt-px shrink-0 text-amber-500" />
            <p>
              Add <b>SPF</b> and <b>DKIM</b> DNS records for your domain so your emails don&apos;t land in
              spam.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
