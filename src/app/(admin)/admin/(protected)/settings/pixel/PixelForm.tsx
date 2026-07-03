"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { savePixelId } from "./actions";

const inputCls =
  "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[14.5px] font-mono text-stone-900 placeholder:text-stone-400 shadow-soft focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

export default function PixelForm({ initialPixelId }: { initialPixelId: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const configured = Boolean(initialPixelId);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await savePixelId(formData);
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
              <h2 className="text-[15px] font-bold text-stone-900">Pixel ID</h2>
              <p className="mt-0.5 text-[13px] text-stone-500">Your Meta (Facebook) Pixel.</p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                configured ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${configured ? "bg-emerald-500" : "bg-stone-400"}`} />
              {configured ? "Active" : "Disabled"}
            </span>
          </div>

          <div className="mt-5">
            <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Facebook Pixel ID</label>
            <input
              name="pixelId"
              defaultValue={initialPixelId ?? ""}
              placeholder="1234567890123456"
              className={inputCls}
            />
            <p className="mt-1.5 text-[12px] text-stone-400">
              Leave blank to disable. Fires PageView automatically, plus AddToCart and Purchase events from
              the storefront.
            </p>
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
          {pending ? "Saving…" : "Save"}
        </button>
      </form>

      {/* Info + setup guide */}
      <aside className="space-y-4 lg:self-start">
        {/* What / why / benefits */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon name="info" size={18} />
            </span>
            <h2 className="text-[15px] font-bold text-stone-900">About Facebook Pixel</h2>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-[13px] font-semibold text-stone-800">What is it?</p>
              <p className="mt-1 text-[13px] leading-relaxed text-stone-500">
                The <b className="text-stone-700">Meta (Facebook) Pixel</b> is a small piece of tracking code
                that reports visitor actions on your store — page views, add-to-cart, and purchases — back to
                your Facebook Ads account.
              </p>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-stone-800">Why use it?</p>
              <p className="mt-1 text-[13px] leading-relaxed text-stone-500">
                It connects your ad spend to real shopper behavior, so Facebook and Instagram can show your
                ads to the people most likely to buy and measure what each campaign actually earns.
              </p>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-stone-800">What are the benefits?</p>
              <ul className="mt-1.5 space-y-1.5">
                {[
                  "Track conversions and real sales from your ads",
                  "Retarget visitors who left without buying",
                  "Build lookalike audiences of similar shoppers",
                  "Optimize delivery toward people likely to purchase",
                ].map((b) => (
                  <li key={b} className="flex gap-2 text-[13px] leading-relaxed text-stone-500">
                    <Icon name="check" size={15} strokeWidth={2.4} className="mt-0.5 shrink-0 text-brand-500" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Where to find it */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon name="search" size={18} />
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-stone-900">Where to find your Pixel ID</h2>
              <p className="text-[12.5px] text-stone-500">In Meta Events Manager</p>
            </div>
          </div>

          <ol className="mt-5 space-y-0">
            {[
              {
                title: "Open Events Manager",
                body: (
                  <>
                    Go to{" "}
                    <a
                      href="https://business.facebook.com/events_manager2/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand-600 underline underline-offset-2"
                    >
                      Meta Events Manager
                    </a>{" "}
                    and sign in with your business account.
                  </>
                ),
              },
              {
                title: "Connect a data source",
                body: (
                  <>
                    Click <b>Connect data sources → Web</b>, then create a <b>Pixel</b> and give it a name.
                  </>
                ),
              },
              {
                title: "Copy the Pixel ID",
                body: (
                  <>
                    Select your pixel — the <b>Pixel ID</b> is the long number shown under its name (e.g.{" "}
                    <code className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[12px]">1234567890123456</code>).
                  </>
                ),
              },
              {
                title: "Paste & save",
                body: (
                  <>
                    Enter it in the field on the left and press <b>Save</b>. Tracking starts on the storefront
                    right away.
                  </>
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
              The Pixel ID is a <b>numeric</b> value (15–16 digits) — not the pixel name. Copy the number, not
              the label.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
