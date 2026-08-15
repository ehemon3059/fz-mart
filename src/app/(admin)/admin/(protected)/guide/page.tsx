import Link from "next/link";
import {
  STAGES,
  LOOP_NODES,
  PL_ROWS,
  LEDGER_ROWS,
  ROUTE_INDEX,
  HABITS,
  type GuideCell,
  type GuideTable,
} from "./content";

export const metadata = { title: "কর্মপদ্ধতি — FZ-Mart Admin" };

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
    "px-4 py-2.5 align-top text-[13.5px] text-stone-600 border-b border-stone-100",
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
          <caption className="border-b border-stone-200 bg-stone-50 px-4 py-2.5 text-left text-[12.5px] text-stone-500">
            {table.caption}
          </caption>
        )}
        <thead>
          <tr>
            {table.head.map((h, i) => (
              <th
                key={h}
                className={`whitespace-nowrap border-b border-stone-200 px-4 py-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-stone-400 ${
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
      className="inline-flex items-center gap-2 rounded-md border border-accent/30 bg-accent-soft px-2.5 py-1 text-[12px] font-medium text-accent transition-colors hover:bg-accent hover:text-white"
    >
      {label}
      <span className="font-mono text-[11px] opacity-70">{href}</span>
    </Link>
  );
}

export default function AdminGuidePage() {
  return (
    <div className="space-y-6 px-4 py-8 sm:px-7">
      {/* Masthead */}
      <div className="border-b-2 border-stone-900 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-stone-400">
          FZ-Mart · কর্মপদ্ধতি
        </p>
        <h1 className="mt-2 text-[26px] font-extrabold leading-tight tracking-tight text-stone-900 sm:text-[32px]">
          সাপ্লায়ার থেকে লাভ পর্যন্ত
        </h1>
        <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-stone-500">
          পণ্য কেনা, স্টকে রাখা, বিক্রি করা এবং মাস শেষে লাভ-লোকসান বের করা — পুরো কাজটা ৫টি
          ধাপে। প্রতিটি ধাপে প্যানেলের সংশ্লিষ্ট পাতার লিংক দেওয়া আছে।
        </p>
        <p className="mt-3 text-[12.5px] text-stone-400">
          ফর্মের ফিল্ড ও বাটনের নাম ইংরেজিতেই রাখা হয়েছে, যেভাবে সেগুলো পর্দায় দেখা যায়।
        </p>
      </div>

      {/* The loop */}
      <div>
        <p className="text-[13.5px] text-stone-500">
          টাকার চক্র — আপনার পুঁজি চারবার রূপ বদলায়, তারপর বেড়ে অথবা কমে ফিরে আসে।
        </p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {LOOP_NODES.map((n) => (
            <div
              key={n.k}
              className="rounded-lg border border-stone-200 border-t-[3px] border-t-accent bg-white px-4 py-3 shadow-card"
            >
              <p className="font-mono text-[10.5px] tracking-wider text-stone-400">{n.k}</p>
              <p className="mt-0.5 text-[16px] font-bold text-stone-900">{n.t}</p>
              <p className="mt-1 text-[12.5px] leading-snug text-stone-500">{n.s}</p>
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
            <p className="font-mono text-[38px] leading-none text-stone-200">{stage.numeral}</p>
            <p className="text-[12.5px] leading-tight text-stone-400 md:mt-2">
              {stage.railTop}
              <br className="hidden md:inline" />
              <span className="md:hidden"> · </span>
              {stage.railBottom}
            </p>
          </div>

          {/* Body */}
          <div className="min-w-0">
            <h2 className="text-[22px] font-bold tracking-tight text-stone-900">
              {stage.heading}
            </h2>
            <p className="mt-2 max-w-[68ch] text-[15px] leading-relaxed text-stone-600">
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
                    <p className="font-semibold text-stone-900">{step.title}</p>
                    {step.detail && (
                      <p className="mt-1 max-w-[66ch] text-[13.5px] leading-relaxed text-stone-600">
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
                      <p className="mt-2 text-[13px] text-stone-500">
                        শেষে{" "}
                        <span className="rounded bg-stone-900 px-2 py-0.5 text-[12px] font-semibold text-white">
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
                  <p key={f.label} className="py-1 text-[14px] leading-relaxed">
                    <span className="text-stone-400">{f.label}</span>{" "}
                    <span className="font-mono font-bold text-stone-900">=</span>{" "}
                    <span className="text-stone-700">{f.body}</span>
                  </p>
                ))}
              </div>
            )}

            {stage.tables?.map((t, i) => <GuideTableBlock key={i} table={t} />)}

            {/* The ledger table only belongs to stage 3. */}
            {stage.numeral === "০৩" && (
              <>
                <div className="mt-5 overflow-x-auto rounded-lg border border-stone-200 bg-white">
                  <table className="w-full border-collapse">
                    <caption className="border-b border-stone-200 bg-stone-50 px-4 py-2.5 text-left text-[12.5px] text-stone-500">
                      স্টক বদলানোর ৬টি কারণ · স্টক লেজারে যা লেখা হয়
                    </caption>
                    <thead>
                      <tr>
                        <th className="border-b border-stone-200 px-4 py-2.5 text-left font-mono text-[10.5px] font-semibold uppercase tracking-wider text-stone-400">
                          ধরন
                        </th>
                        <th className="border-b border-stone-200 px-4 py-2.5 text-right font-mono text-[10.5px] font-semibold uppercase tracking-wider text-stone-400">
                          চিহ্ন
                        </th>
                        <th className="border-b border-stone-200 px-4 py-2.5 text-left font-mono text-[10.5px] font-semibold uppercase tracking-wider text-stone-400">
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
                          <td className="border-b border-stone-100 px-4 py-2.5 text-[13.5px] text-stone-600">
                            {r.when}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="mt-5 max-w-[68ch] text-[14px] leading-relaxed text-stone-600">
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

            {/* The example P&L only belongs to stage 5. */}
            {stage.numeral === "০৫" && (
              <div className="mt-5 overflow-x-auto rounded-lg border border-stone-200 bg-white">
                <table className="w-full border-collapse">
                  <caption className="border-b border-stone-200 bg-stone-50 px-4 py-2.5 text-left text-[12.5px] text-stone-500">
                    উদাহরণ · আগস্ট ২০২৬ · ২১৪টি ডেলিভারি, ৯টি ফেরত
                  </caption>
                  <tbody>
                    {PL_ROWS.map((r) => {
                      if (r.kind === "section") {
                        return (
                          <tr key={r.label}>
                            <td
                              colSpan={2}
                              className="px-4 pb-1 pt-5 font-mono text-[10.5px] uppercase tracking-wider text-stone-400"
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
                            className={`px-4 py-2 text-[13.5px] ${
                              r.kind === "sub" ? "pl-9 text-stone-600" : "text-stone-900"
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
              <p key={n} className="mt-5 max-w-[68ch] text-[14px] leading-relaxed text-stone-600">
                {n}
              </p>
            ))}

            {/* You / the panel */}
            {stage.doPanel && (
              <div className="mt-5 grid overflow-hidden rounded-lg border border-stone-200 md:grid-cols-2">
                <div className="bg-white p-5">
                  <p className="mb-3 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-stone-400">
                    {stage.numeral === "০৫" ? "যা আপনাকে হাতে লিখতে হবে" : "আপনি যা করবেন"}
                  </p>
                  <ul className="list-disc space-y-2 pl-5">
                    {stage.doPanel.you.map((li) => (
                      <li key={li} className="text-[13.5px] leading-relaxed text-stone-600">
                        {li}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-stone-200 bg-stone-50 p-5 md:border-l md:border-t-0">
                  <p className="mb-3 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-stone-400">
                    {stage.numeral === "০৫" ? "যা নিজে থেকেই আসে" : "প্যানেল যা করবে"}
                  </p>
                  <ul className="list-disc space-y-2 pl-5">
                    {stage.doPanel.panel.map((li) => (
                      <li key={li} className="text-[13.5px] leading-relaxed text-stone-600">
                        {li}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {stage.callout && (
              <p className="mt-5 max-w-[68ch] rounded-lg border border-stone-200 border-l-[3px] border-l-warning bg-warning-soft px-5 py-4 text-[14px] leading-relaxed text-stone-700">
                {stage.callout}
              </p>
            )}
          </div>
        </section>
      ))}

      {/* Quick reference */}
      <section className="border-t-2 border-stone-900 pt-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-stone-400">
          দ্রুত রেফারেন্স
        </p>
        <h2 className="mt-2 text-[21px] font-bold tracking-tight text-stone-900">
          সব পাতার ঠিকানা এক জায়গায়
        </h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border-b border-stone-200 px-4 py-2.5 text-left font-mono text-[10.5px] font-semibold uppercase tracking-wider text-stone-400">
                  কাজ
                </th>
                <th className="border-b border-stone-200 px-4 py-2.5 text-left font-mono text-[10.5px] font-semibold uppercase tracking-wider text-stone-400">
                  ঠিকানা
                </th>
              </tr>
            </thead>
            <tbody>
              {ROUTE_INDEX.map((r) => (
                <tr key={r.href}>
                  <td className="border-b border-stone-100 px-4 py-2.5 text-[13.5px] text-stone-600">
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

        <h2 className="mt-10 text-[21px] font-bold tracking-tight text-stone-900">
          চারটি অভ্যাস যা হিসাব সঠিক রাখে
        </h2>
        <div className="mt-4 grid gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
          {HABITS.map((h) => (
            <div key={h.title} className="bg-white p-5">
              <h3 className="text-[15px] font-bold text-stone-900">{h.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-stone-600">{h.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
