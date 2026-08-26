import Link from "next/link";
import {
  MASTHEAD,
  NAV_MAP,
  STAGES,
  LOOP_NODES,
  TRACE_ROWS,
  PL_ROWS,
  LEDGER_ROWS,
  ROUTE_INDEX,
  HABITS,
  type GuideCell,
  type GuideTable,
} from "./content";

export const metadata = { title: "কর্মপদ্ধতি — FZ-Mart Admin" };

// Bangla text must never ride the panel's latin-only faces. Geist, Manrope and
// Spline Sans Mono are all latin subsets (see the font block in app/layout.tsx),
// so a Bengali string set in `font-mono` or the Arial body stack falls through
// to whatever the OS happens to have — which renders as tofu, or as a face with
// no real weight range, and reads as "invisible text" on some machines.
//
// `bn` puts a Bengali stack in front for prose, and `bnLabel` is the version
// for the small uppercase labels that were previously font-mono. Latin-only
// content (route paths, ledger type names, figures) keeps font-mono, which is
// exactly what that face is good at.
const bn =
  "[font-family:'Noto_Sans_Bengali','Nirmala_UI','SolaimanLipi','Kalpurush',system-ui,sans-serif]";
const bnLabel = `${bn} tracking-normal`;

// The Bangla operating guide: how the shop's money moves, from buying stock to
// the monthly P&L. Deliberately NOT permission-gated beyond the base admin
// check — a staff member who only touches orders still benefits from knowing
// why "Delivered" is the moment that matters.
//
// Content lives in ./content.ts; this file is only the renderer. Static page,
// no data fetching, so nothing here is async.

const CHIP_TONE = {
  ok: "border-success-fg/30 bg-success-soft text-success-fg",
  warn: "border-warning-fg/30 bg-warning-soft text-warning-fg",
  bad: "border-danger-fg/30 bg-danger-soft text-danger-fg",
  mute: "border-stone-300 bg-stone-100 text-stone-500",
} as const;

const SIGN_TONE = {
  in: "text-success-fg",
  out: "text-danger-fg",
  muted: "text-stone-400",
} as const;

function Cell({ cell, align }: { cell: GuideCell; align: "left" | "right" }) {
  const classes = [
    "px-4 py-2.5 align-top text-[14px] leading-relaxed text-stone-700 border-b border-stone-100",
    // Latin content (figures, ledger types) keeps the mono face; Bangla prose
    // gets the Bengali stack so it never falls back to a latin-only subset.
    cell.mono ? "" : bn,
    align === "right" ? "text-right tabular-nums whitespace-nowrap" : "",
    cell.mono ? "font-mono text-[12.5px] text-stone-900 whitespace-nowrap" : "",
    cell.bold ? "font-semibold text-stone-900" : "",
    cell.tone ? SIGN_TONE[cell.tone] : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <td className={classes} colSpan={cell.span}>
      {cell.chip ? (
        <span
          className={`inline-block rounded border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider ${CHIP_TONE[cell.chip]}`}
        >
          {cell.text}
        </span>
      ) : (
        cell.text
      )}
    </td>
  );
}

function GuideTableBlock({ table }: { table: GuideTable }) {
  const align = table.align ?? table.head.map(() => "left" as const);
  return (
    <div className="mt-5 overflow-x-auto rounded-lg border border-stone-200 bg-white">
      <table className="w-full border-collapse">
        {table.caption && (
          <caption
            className={`border-b border-stone-200 bg-stone-50 px-4 py-2.5 text-left text-[13px] text-stone-600 ${bn}`}
          >
            {table.caption}
          </caption>
        )}
        <thead>
          <tr>
            {table.head.map((h, i) => (
              <th
                key={h}
                className={`whitespace-nowrap border-b border-stone-200 px-4 py-2.5 text-[12px] font-semibold text-stone-600 ${bnLabel} ${
                  align[i] === "right" ? "text-right" : "text-left"
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <Cell key={ci} cell={cell} align={align[ci] ?? "left"} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A route link rendered as a clickable chip. */
function RouteChip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-md border border-accent/40 bg-accent-soft px-2.5 py-1.5 text-[13px] font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
    >
      <span className={bn}>{label}</span>
      <span className="font-mono text-[11px] opacity-80">{href}</span>
    </Link>
  );
}

export default function AdminGuidePage() {
  return (
    <div className="space-y-6 px-4 py-8 sm:px-7">
      {/* Masthead */}
      <div className="border-b-2 border-stone-900 pb-6">
        <p className={`text-[12px] font-semibold tracking-wide text-stone-500 ${bn}`}>
          {MASTHEAD.eyebrow}
        </p>
        <h1
          className={`mt-2 text-[26px] font-extrabold leading-tight text-stone-900 sm:text-[32px] ${bn}`}
        >
          {MASTHEAD.title}
        </h1>
        <p className={`mt-2 max-w-[62ch] text-[15px] leading-relaxed text-stone-600 ${bn}`}>
          {MASTHEAD.lede}
        </p>
        <p className={`mt-3 text-[13px] text-stone-500 ${bn}`}>{MASTHEAD.note}</p>
      </div>

      {/* Where things live — the sidebar, in one screen */}
      <div>
        <p className={`text-[14px] text-stone-600 ${bn}`}>
          বাঁ পাশের মেনু ছয়টি ভাগে সাজানো। এই নির্দেশিকার কাজগুলো প্রথম চারটির মধ্যেই।
        </p>
        <div className="mt-3 grid gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
          {NAV_MAP.map((n) => (
            <div key={n.heading} className="bg-white px-4 py-3">
              <p className="font-mono text-[11px] font-semibold tracking-wider text-accent">
                {n.heading}
              </p>
              <p className={`mt-1 text-[13px] leading-snug text-stone-600 ${bn}`}>{n.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* The loop */}
      <div>
        <p className={`text-[14px] text-stone-600 ${bn}`}>
          টাকার চক্র — আপনার পুঁজি চারবার রূপ বদলায়, তারপর বেড়ে অথবা কমে ফিরে আসে।
        </p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {LOOP_NODES.map((n) => (
            <div
              key={n.k}
              className="rounded-lg border border-stone-200 border-t-[3px] border-t-accent bg-white px-4 py-3 shadow-card"
            >
              <p className="font-mono text-[10.5px] tracking-wider text-stone-500">{n.k}</p>
              <p className={`mt-0.5 text-[16px] font-bold text-stone-900 ${bn}`}>{n.t}</p>
              <p className={`mt-1 text-[13px] leading-snug text-stone-600 ${bn}`}>{n.s}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stages */}
      {STAGES.map((stage, si) => (
        <section
          key={stage.numeral}
          className={`grid gap-6 pt-8 md:grid-cols-[88px_1fr] ${
            si === 0 ? "border-t-2 border-stone-900" : "border-t border-stone-200"
          }`}
        >
          {/* Rail */}
          <div className="flex items-baseline gap-4 md:block">
            <p className={`text-[36px] font-bold leading-none text-stone-300 ${bn}`}>
              {stage.numeral}
            </p>
            <p className={`text-[13px] leading-tight text-stone-500 md:mt-2 ${bn}`}>
              {stage.railTop}
              <br className="hidden md:inline" />
              <span className="md:hidden"> · </span>
              {stage.railBottom}
            </p>
          </div>

          {/* Body */}
          <div className="min-w-0">
            <h2 className={`text-[22px] font-bold text-stone-900 ${bn}`}>{stage.heading}</h2>
            <p className={`mt-2 max-w-[68ch] text-[15px] leading-relaxed text-stone-700 ${bn}`}>
              {stage.lede}
            </p>

            {stage.links && (
              <div className="mt-4 flex flex-wrap gap-2">
                {stage.links.map((l) => (
                  <RouteChip key={l.href} href={l.href} label={l.label} />
                ))}
              </div>
            )}

            {/* Numbered steps */}
            {stage.steps && (
              <ol className="mt-5 space-y-0">
                {stage.steps.map((step, i) => (
                  <li
                    key={step.title}
                    className={`relative ml-3 pb-5 pl-8 ${
                      i === stage.steps!.length - 1 ? "" : "border-l border-stone-200"
                    }`}
                  >
                    <span className="absolute -left-3 top-0 grid h-6 w-6 place-items-center rounded-full bg-accent font-mono text-[11px] text-white">
                      {i + 1}
                    </span>
                    <p className={`text-[15px] font-bold text-stone-900 ${bn}`}>{step.title}</p>
                    {step.detail && (
                      <p className={`mt-1 max-w-[66ch] text-[14px] leading-relaxed text-stone-700 ${bn}`}>
                        {step.detail}
                      </p>
                    )}
                    {step.fields && (
                      <p className="mt-2 flex flex-wrap gap-1.5">
                        {step.fields.map((f) => (
                          <span
                            key={f}
                            className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-mono text-[11.5px] text-stone-700"
                          >
                            {f}
                          </span>
                        ))}
                      </p>
                    )}
                    {step.action && (
                      <p className={`mt-2 text-[14px] text-stone-600 ${bn}`}>
                        শেষে{" "}
                        <span className="rounded bg-stone-900 px-2 py-0.5 font-mono text-[12px] font-semibold text-white">
                          {step.action}
                        </span>{" "}
                        বাটনে চাপ দিন।
                      </p>
                    )}
                    {step.links && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {step.links.map((l) => (
                          <RouteChip key={l.href} href={l.href} label={l.label} />
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}

            {/* Formula */}
            {stage.formula && (
              <div className="mt-5 overflow-x-auto rounded-lg border border-stone-200 border-l-[3px] border-l-accent bg-white px-5 py-4">
                {stage.formula.map((f) => (
                  <p key={f.label} className={`py-1 text-[15px] leading-relaxed ${bn}`}>
                    <span className="text-stone-500">{f.label}</span>{" "}
                    <span className="font-mono font-bold text-accent">=</span>{" "}
                    <span className="font-medium text-stone-800">{f.body}</span>
                  </p>
                ))}
              </div>
            )}

            {stage.tables?.map((t, i) => <GuideTableBlock key={i} table={t} />)}

            {/* The ledger table belongs to whichever stage explains stock. */}
            {stage.showLedger && (
              <>
                <div className="mt-5 overflow-x-auto rounded-lg border border-stone-200 bg-white">
                  <table className="w-full border-collapse">
                    <caption
                      className={`border-b border-stone-200 bg-stone-50 px-4 py-2.5 text-left text-[13px] text-stone-600 ${bn}`}
                    >
                      স্টক বদলানোর ৬টি কারণ · স্টক লেজারে যা লেখা হয়
                    </caption>
                    <thead>
                      <tr>
                        <th
                          className={`border-b border-stone-200 px-4 py-2.5 text-left text-[12px] font-semibold text-stone-600 ${bnLabel}`}
                        >
                          ধরন
                        </th>
                        <th
                          className={`border-b border-stone-200 px-4 py-2.5 text-right text-[12px] font-semibold text-stone-600 ${bnLabel}`}
                        >
                          চিহ্ন
                        </th>
                        <th
                          className={`border-b border-stone-200 px-4 py-2.5 text-left text-[12px] font-semibold text-stone-600 ${bnLabel}`}
                        >
                          কখন লেখা হয়
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {LEDGER_ROWS.map((r) => (
                        <tr key={r.type}>
                          <td className="whitespace-nowrap border-b border-stone-100 px-4 py-2.5 font-mono text-[12.5px] text-stone-900">
                            {r.type}
                          </td>
                          <td
                            className={`border-b border-stone-100 px-4 py-2.5 text-right font-mono font-bold ${SIGN_TONE[r.tone]}`}
                          >
                            {r.sign}
                          </td>
                          <td
                            className={`border-b border-stone-100 px-4 py-2.5 text-[14px] text-stone-700 ${bn}`}
                          >
                            {r.when}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className={`mt-5 max-w-[68ch] text-[14px] leading-relaxed text-stone-700 ${bn}`}>
                  হাতে স্টক ঠিক করতে পণ্যের এডিট পাতায় যান — সেখানে{" "}
                  <span className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-mono text-[11.5px] text-stone-700">
                    Direction
                  </span>{" "}
                  (Add / Remove),{" "}
                  <span className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-mono text-[11.5px] text-stone-700">
                    Quantity
                  </span>{" "}
                  ও{" "}
                  <span className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-mono text-[11.5px] text-stone-700">
                    Reason
                  </span>{" "}
                  দিয়ে সংশোধন করা যায়। কারণ লেখা বাধ্যতামূলক, কারণ ছয় মাস পর আপনাকেই মনে করতে
                  হবে কেন সংখ্যাটা বদলেছিল।
                </p>
                <div className="mt-2">
                  <RouteChip href="/admin/products" label="পণ্য তালিকা" />
                </div>
              </>
            )}

            {/* The example P&L belongs to the stage that teaches the report. */}
            {stage.showPl && (
              <div className="mt-5 overflow-x-auto rounded-lg border border-stone-200 bg-white">
                <table className="w-full border-collapse">
                  <caption
                    className={`border-b border-stone-200 bg-stone-50 px-4 py-2.5 text-left text-[13px] text-stone-600 ${bn}`}
                  >
                    উদাহরণ · আগস্ট ২০২৬ · ২১৪টি ডেলিভারি, ৯টি ফেরত
                  </caption>
                  <tbody>
                    {PL_ROWS.map((r) => {
                      if (r.kind === "section") {
                        return (
                          <tr key={r.label}>
                            <td
                              colSpan={2}
                              className={`px-4 pb-1 pt-5 text-[12px] font-semibold text-stone-600 ${bnLabel}`}
                            >
                              {r.label}
                            </td>
                          </tr>
                        );
                      }
                      const isFinal = r.kind === "final";
                      const isSubtotal = r.kind === "subtotal";
                      return (
                        <tr
                          key={r.label}
                          className={
                            isFinal
                              ? "border-y-2 border-stone-900"
                              : isSubtotal
                                ? "border-y border-stone-200 bg-stone-50"
                                : ""
                          }
                        >
                          <td
                            className={`px-4 py-2 text-[14px] ${bn} ${
                              r.kind === "sub" ? "pl-9 text-stone-700" : "text-stone-900"
                            } ${isFinal ? "text-[16px] font-bold" : ""} ${
                              isSubtotal ? "font-semibold" : ""
                            }`}
                          >
                            {r.label}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-2 text-right font-mono tabular-nums ${
                              isFinal
                                ? "text-[16px] font-bold text-success-fg"
                                : isSubtotal
                                  ? "font-semibold text-stone-900"
                                  : r.value.startsWith("−")
                                    ? "text-danger-fg"
                                    : "text-stone-700"
                            }`}
                          >
                            {r.value}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {stage.notes?.map((n) => (
              <p
                key={n}
                className={`mt-5 max-w-[68ch] text-[14px] leading-relaxed text-stone-700 ${bn}`}
              >
                {n}
              </p>
            ))}

            {/* You / the panel */}
            {stage.doPanel && (
              <div className="mt-5 grid overflow-hidden rounded-lg border border-stone-200 md:grid-cols-2">
                <div className="bg-white p-5">
                  <p className={`mb-3 text-[12px] font-bold text-stone-500 ${bnLabel}`}>
                    {stage.doPanelLabels?.you ?? "আপনি যা করবেন"}
                  </p>
                  <ul className="list-disc space-y-2 pl-5">
                    {stage.doPanel.you.map((li) => (
                      <li
                        key={li}
                        className={`text-[14px] leading-relaxed text-stone-700 ${bn}`}
                      >
                        {li}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-stone-200 bg-stone-50 p-5 md:border-l md:border-t-0">
                  <p className={`mb-3 text-[12px] font-bold text-stone-500 ${bnLabel}`}>
                    {stage.doPanelLabels?.panel ?? "প্যানেল যা করবে"}
                  </p>
                  <ul className="list-disc space-y-2 pl-5">
                    {stage.doPanel.panel.map((li) => (
                      <li
                        key={li}
                        className={`text-[14px] leading-relaxed text-stone-700 ${bn}`}
                      >
                        {li}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {stage.callout && (
              <p
                className={`mt-5 max-w-[68ch] rounded-lg border border-warning/30 border-l-[3px] border-l-warning bg-warning-soft px-5 py-4 text-[14px] leading-relaxed text-stone-800 ${bn}`}
              >
                {stage.callout}
              </p>
            )}
          </div>
        </section>
      ))}

      {/* One product, end to end — which screen answers which question */}
      <section className="border-t-2 border-stone-900 pt-8">
        <p className={`text-[12px] font-semibold tracking-wide text-stone-500 ${bn}`}>
          কেনা থেকে বিক্রি
        </p>
        <h2 className={`mt-2 text-[21px] font-bold text-stone-900 ${bn}`}>
          একটি পণ্যের পুরো হিসাব কোথায় দেখবেন
        </h2>
        <p className={`mt-2 max-w-[68ch] text-[15px] leading-relaxed text-stone-700 ${bn}`}>
          “এই পণ্যটা কত দিয়ে কিনেছিলাম, কত দিয়ে বিক্রি হলো, আর তাতে লাভ কত?” — এক পাতায় এর
          পুরো উত্তর নেই, কারণ প্রতিটি ধাপ আলাদা জায়গায় লেখা হয়। ক্রম অনুযায়ী পাতাগুলো এই।
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["প্রশ্ন", "কোন পাতায়", "যা দেখাবে"].map((h) => (
                  <th
                    key={h}
                    className={`border-b border-stone-200 px-4 py-2.5 text-left text-[12px] font-semibold text-stone-600 ${bnLabel}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TRACE_ROWS.map((r) => (
                <tr key={r.step}>
                  <td
                    className={`border-b border-stone-100 px-4 py-2.5 text-[14px] font-semibold text-stone-900 ${bn}`}
                  >
                    {r.step}
                  </td>
                  <td className="border-b border-stone-100 px-4 py-2.5">
                    <Link
                      href={r.href}
                      className={`text-[14px] font-semibold text-accent hover:underline ${bn}`}
                    >
                      {r.where}
                    </Link>
                  </td>
                  <td
                    className={`border-b border-stone-100 px-4 py-2.5 text-[14px] text-stone-700 ${bn}`}
                  >
                    {r.shows}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quick reference */}
      <section className="pt-8">
        <p className={`text-[12px] font-semibold tracking-wide text-stone-500 ${bn}`}>
          দ্রুত রেফারেন্স
        </p>
        <h2 className={`mt-2 text-[21px] font-bold text-stone-900 ${bn}`}>
          সব পাতার ঠিকানা এক জায়গায়
        </h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th
                  className={`border-b border-stone-200 px-4 py-2.5 text-left text-[12px] font-semibold text-stone-600 ${bnLabel}`}
                >
                  কাজ
                </th>
                <th
                  className={`border-b border-stone-200 px-4 py-2.5 text-left text-[12px] font-semibold text-stone-600 ${bnLabel}`}
                >
                  ঠিকানা
                </th>
              </tr>
            </thead>
            <tbody>
              {ROUTE_INDEX.map((r) => (
                <tr key={r.href}>
                  <td
                    className={`border-b border-stone-100 px-4 py-2.5 text-[14px] text-stone-700 ${bn}`}
                  >
                    {r.label}
                  </td>
                  <td className="border-b border-stone-100 px-4 py-2.5">
                    <Link
                      href={r.href}
                      className="font-mono text-[12.5px] text-accent hover:underline"
                    >
                      {r.href}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className={`mt-10 text-[21px] font-bold text-stone-900 ${bn}`}>
          চারটি অভ্যাস যা হিসাব সঠিক রাখে
        </h2>
        <div className="mt-4 grid gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
          {HABITS.map((h) => (
            <div key={h.title} className="bg-white p-5">
              <h3 className={`text-[15px] font-bold text-stone-900 ${bn}`}>{h.title}</h3>
              <p className={`mt-1.5 text-[14px] leading-relaxed text-stone-700 ${bn}`}>{h.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
