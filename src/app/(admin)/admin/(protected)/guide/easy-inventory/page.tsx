import Link from "next/link";
import {
  JOURNEY,
  PO_SPLIT,
  LANDED,
  STOCK,
  ORDER_STATES,
  ORDER_WATERFALL,
  MONTH_WATERFALL,
  CASH_WATERFALL,
  SECTIONS,
  MISTAKES,
  bnTaka,
  type Section as SectionData,
} from "./content";
import {
  BN,
  Figure,
  Legend,
  JourneyStrip,
  CostSplitBar,
  LandedBars,
  DraftGate,
  StockBars,
  OrderRail,
  Waterfall,
} from "./diagrams";

export const metadata = { title: "Easy Inventory — FZ-Mart Admin" };

// The illustrated companion to /admin/guide.
//
// The written guide is a procedure: which screen, which field, which button.
// This page is the picture behind it — one ৳1,15,000 purchase order followed
// all the way to a month's ৳35,380 of profit, drawn at every step. It exists
// because "কোথায় লাভ, কোথায় লোকসান" is a question about *flow*, and a flow is
// far quicker to see than to read.
//
// Static and server-rendered: the figures carry one fixed worked example, and
// every value is printed on its own mark, so there is nothing for client-side
// interaction to reveal. Content and numbers live in ./content.ts, the drawings
// in ./diagrams.tsx; this file only arranges them.

function RouteChip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-md border border-accent/40 bg-accent-soft px-2.5 py-1.5 text-[13px] font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
    >
      <span className={BN}>{label}</span>
      <span className="font-mono text-[11px] opacity-80">{href}</span>
    </Link>
  );
}

/** One numbered stage: rail, prose, the drawing, then the drawing read out. */
function Stage({ data, children }: { data: SectionData; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-stone-200 pt-8 md:grid-cols-[88px_1fr]">
      <div className="flex items-baseline gap-4 md:block">
        <p className={`text-[36px] font-bold leading-none text-stone-300 ${BN}`}>{data.numeral}</p>
        <p className={`text-[13px] leading-tight text-stone-500 md:mt-2 ${BN}`}>{data.eyebrow}</p>
      </div>

      <div className="min-w-0">
        <h2 className={`text-[22px] font-bold text-stone-900 ${BN}`}>{data.heading}</h2>
        <p className={`mt-2 max-w-[68ch] text-[15px] leading-relaxed text-stone-700 ${BN}`}>
          {data.lede}
        </p>

        {children}

        <div className="mt-5 rounded-lg border border-stone-200 border-l-[3px] border-l-accent bg-white px-5 py-4">
          <p className={`text-[12px] font-bold text-stone-500 ${BN}`}>ছবিটা যা বলছে</p>
          <ul className="mt-2 space-y-1.5">
            {data.readings.map((r) => (
              <li key={r} className={`flex gap-2.5 text-[14px] leading-relaxed text-stone-700 ${BN}`}>
                <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {data.callout && (
          <p
            className={`mt-5 max-w-[68ch] rounded-lg border border-warning/30 border-l-[3px] border-l-warning bg-warning-soft px-5 py-4 text-[14px] leading-relaxed text-stone-800 ${BN}`}
          >
            {data.callout}
          </p>
        )}

        {data.links && (
          <div className="mt-5 flex flex-wrap gap-2">
            {data.links.map((l) => (
              <RouteChip key={l.href} href={l.href} label={l.label} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function EasyInventoryPage() {
  return (
    <div className="space-y-6 px-4 py-8 sm:px-7">
      {/* Masthead */}
      <div className="border-b-2 border-stone-900 pb-6">
        <p className={`text-[12px] font-semibold tracking-wide text-stone-500 ${BN}`}>
          FZ-Mart · Easy Inventory
        </p>
        <h1
          className={`mt-2 text-[26px] font-extrabold leading-tight text-stone-900 sm:text-[32px] ${BN}`}
        >
          ছবিতে দেখুন — পণ্য কীভাবে এল, কীভাবে বিক্রি হলো, লাভ কোথায়
        </h1>
        <p className={`mt-2 max-w-[64ch] text-[15px] leading-relaxed text-stone-600 ${BN}`}>
          একটি চালান, শুরু থেকে শেষ পর্যন্ত। {bnTaka(115000)} দিয়ে কেনা মাল কীভাবে গুদামে ঢোকে,
          কীভাবে ওয়েবসাইটে ওঠে, কীভাবে বিক্রি হয়, আর মাস শেষে তা থেকে কত টাকা আসলে থেকে যায় —
          প্রতিটি ধাপ ছবি দিয়ে দেখানো।
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <RouteChip href="/admin/guide" label="লিখিত কর্মপদ্ধতি (ধাপে ধাপে বাটন)" />
        </div>
      </div>

      {/* The loop, drawn once at the top so the rest has a spine */}
      <Figure caption="পুরো গল্প এক নজরে · আপনার পুঁজি পাঁচবার রূপ বদলে ফিরে আসে">
        <JourneyStrip nodes={JOURNEY} />
      </Figure>

      <Stage data={SECTIONS.buy}>
        <Figure
          caption={`${PO_SPLIT.poNo} · ${PO_SPLIT.supplier} · চালানের মোট খরচ কীভাবে গঠিত`}
        >
          <CostSplitBar parts={PO_SPLIT.parts} total={PO_SPLIT.total} />
          <Legend
            items={[
              { color: "#0a7d57", label: "পণ্যের দাম", value: bnTaka(PO_SPLIT.parts[0].value) },
              { color: "#6fcca3", label: "ভাড়া ও কাস্টমস", value: bnTaka(PO_SPLIT.parts[1].value) },
            ]}
          />
        </Figure>
      </Stage>

      <Stage data={SECTIONS.landed}>
        <Figure caption="মাল বুঝে নেওয়ার পর · প্রতি পিসের আসল খরচ (landed cost)">
          <LandedBars rows={LANDED} />
          <Legend
            items={[
              { color: "#0a7d57", label: "সাপ্লায়ারের দাম" },
              { color: "#6fcca3", label: "ভাড়া ও কাস্টমসের ভাগ" },
            ]}
          />
        </Figure>
      </Stage>

      <Stage data={SECTIONS.live}>
        <Figure caption="পণ্যের দরজা · ছবি ও দাম না থাকলে পণ্য ওয়েবসাইটে ওঠে না">
          <DraftGate />
        </Figure>
      </Stage>

      <Stage data={SECTIONS.stock}>
        <Figure caption="একটি পণ্যের স্টক · গুদামে ১০০, অর্ডার হয়ে আছে ১২, পথে আরও ৪০">
          <StockBars onHand={STOCK.onHand} reserved={STOCK.reserved} incoming={STOCK.incoming} />
          <Legend
            items={[
              { color: "#0a7d57", label: "Available — বিক্রি হতে পারে" },
              { color: "#b45309", label: "Reserved — অর্ডার হয়ে আছে" },
              { dashed: true, label: "Incoming — এখনো আসেনি" },
            ]}
          />
        </Figure>
      </Stage>

      <Stage data={SECTIONS.sell}>
        <Figure caption="একটি অর্ডারের যাত্রা · সবুজ ঘরটিই সেই মুহূর্ত যখন টাকা হিসাবে ওঠে">
          <OrderRail states={ORDER_STATES} />
        </Figure>
      </Stage>

      <Stage data={SECTIONS.unit}>
        <Figure caption={`একটি পাঞ্জাবি ${bnTaka(1200)} টাকায় বিক্রি · টাকাটা কোথায় কোথায় যায়`}>
          <Waterfall
            bars={ORDER_WATERFALL}
            label="এক অর্ডারের বিক্রয়মূল্য থেকে খরচ বাদ দিয়ে নিট লাভ"
          />
          <Legend
            items={[
              { color: "#23211e", label: "যা এল" },
              { color: "#dc2626", label: "যা কাটা গেল" },
              { color: "#0a7d57", label: "যা থেকে গেল" },
            ]}
          />
        </Figure>
      </Stage>

      <Stage data={SECTIONS.month}>
        <Figure caption="আগস্ট ২০২৬ · ২১৪টি ডেলিভারি, ৯টি ফেরত · মাসের লাভ-লোকসান">
          <Waterfall bars={MONTH_WATERFALL} label="মাসিক লাভ-লোকসানের ঝরনা" />
          <Legend
            items={[
              { color: "#23211e", label: "মোট বিক্রি" },
              { color: "#dc2626", label: "খরচ ও বাদ" },
              { color: "#44413c", label: "উপ-মোট" },
              { color: "#0a7d57", label: "নিট লাভ" },
            ]}
          />
        </Figure>
      </Stage>

      <Stage data={SECTIONS.cash}>
        <Figure caption="একই মাস · খাতার লাভ বনাম হাতের টাকা">
          <Waterfall bars={CASH_WATERFALL} label="লাভ থেকে নতুন স্টক কেনার পর হাতে যা থাকে" />
        </Figure>
      </Stage>

      {/* What breaks the numbers */}
      <section className="border-t-2 border-stone-900 pt-8">
        <p className={`text-[12px] font-semibold tracking-wide text-stone-500 ${BN}`}>সতর্কতা</p>
        <h2 className={`mt-2 text-[21px] font-bold text-stone-900 ${BN}`}>
          চারটি ভুল, যা উপরের সব হিসাব চুপচাপ নষ্ট করে দেয়
        </h2>
        <p className={`mt-2 max-w-[68ch] text-[15px] leading-relaxed text-stone-700 ${BN}`}>
          এই ভুলগুলোর কোনোটিই কোনো এরর দেখায় না। রিপোর্ট ঠিকঠাক চলতে থাকে, শুধু সংখ্যাগুলো আর
          সত্যি থাকে না।
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["যে ভুলটি হয়", "যা ঘটে", "যা করা উচিত"].map((h) => (
                  <th
                    key={h}
                    className={`border-b border-stone-200 px-4 py-2.5 text-left text-[12px] font-semibold text-stone-600 ${BN}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MISTAKES.map((m) => (
                <tr key={m.wrong}>
                  <td
                    className={`border-b border-stone-100 px-4 py-2.5 text-[14px] font-semibold text-stone-900 ${BN}`}
                  >
                    {m.wrong}
                  </td>
                  <td
                    className={`border-b border-stone-100 px-4 py-2.5 text-[14px] leading-relaxed text-danger-fg ${BN}`}
                  >
                    {m.effect}
                  </td>
                  <td
                    className={`border-b border-stone-100 px-4 py-2.5 text-[14px] leading-relaxed text-stone-700 ${BN}`}
                  >
                    {m.right}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 rounded-lg border border-stone-200 bg-stone-50 px-5 py-5">
          <h3 className={`text-[15px] font-bold text-stone-900 ${BN}`}>
            এবার হাতে-কলমে করতে চান?
          </h3>
          <p className={`mt-1.5 max-w-[62ch] text-[14px] leading-relaxed text-stone-700 ${BN}`}>
            লিখিত কর্মপদ্ধতিতে প্রতিটি ধাপের ফর্ম, ফিল্ড আর বাটনের নাম ধরে ধরে দেওয়া আছে —
            সাপ্লায়ার যোগ করা থেকে মাসের খরচ লেখা পর্যন্ত।
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <RouteChip href="/admin/guide" label="লিখিত কর্মপদ্ধতি" />
            <RouteChip href="/admin/inventory" label="স্টক তালিকা" />
            <RouteChip href="/admin/reports/finance" label="লাভ-লোকসান রিপোর্ট" />
          </div>
        </div>
      </section>
    </div>
  );
}
