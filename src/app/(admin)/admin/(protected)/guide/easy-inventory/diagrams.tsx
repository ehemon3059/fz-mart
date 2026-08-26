// The drawings for /admin/guide/easy-inventory.
//
// Hand-authored inline SVG rather than a chart library: these are teaching
// figures with one fixed dataset each, so a runtime charting dependency would
// buy nothing and cost a client bundle. Everything here is a server component.
//
// COLOUR IS MEANING, and only ever one of three meanings:
//   green  — money coming in, or stock you may actually sell
//   red    — money going out
//   stone  — a subtotal, or something not yet yours
// The green/amber and green/red pairs were checked for colour-blind separation
// (ΔE 8.4 protan and 9.7 protan, both above the floor) before being used, and
// every mark is direct-labelled as well, so nothing here is colour-alone.
//
// Mark specs follow one rule set: bars 20–24px thick, a 4px rounded data-end
// with the baseline end square, a 2px surface gap between touching segments,
// hairline rules, and no gridlines — every value is labelled on the mark.

import { bnNum, bnTaka, type WfBar } from "./content";

// Bangla must not ride the panel's latin-only faces (see the note in
// guide/page.tsx); SVG <text> needs the same stack or it renders as tofu.
export const BN =
  "[font-family:'Noto_Sans_Bengali','Nirmala_UI','SolaimanLipi','Kalpurush',system-ui,sans-serif]";

const INK = "#23211e";
const TEXT = "#44413c";
const MUTED = "#76716a";
const RULE = "#e7e5e1";
const SURFACE = "#ffffff";
const GREEN = "#0a7d57";
const GREEN_SOFT = "#6fcca3";
const AMBER = "#b45309";
const RED = "#dc2626";

/**
 * A bar with one rounded data-end and one square baseline end.
 *
 * `roundSide` names the end the data grows towards — the end that means
 * something. Radius is clamped so a 3px bar doesn't become a lozenge.
 */
function barPath(
  x: number,
  y: number,
  w: number,
  h: number,
  roundSide: "top" | "right" | "bottom",
  radius = 4,
): string {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  if (r === 0) return `M${x},${y}h${w}v${h}h${-w}Z`;
  if (roundSide === "right") {
    return `M${x},${y}h${w - r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - r)}Z`;
  }
  if (roundSide === "bottom") {
    return `M${x},${y}h${w}v${h - r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - 2 * r)}a${r},${r} 0 0 1 ${-r},${-r}Z`;
  }
  return `M${x},${y + r}a${r},${r} 0 0 1 ${r},${-r}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - r}h${-w}Z`;
}

/** Figure frame: caption above, horizontally scrollable plot below. */
export function Figure({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="mt-5 overflow-hidden rounded-lg border border-stone-200 bg-white">
      <figcaption
        className={`border-b border-stone-200 bg-stone-50 px-4 py-2.5 text-[13px] text-stone-600 ${BN}`}
      >
        {caption}
      </figcaption>
      <div className="overflow-x-auto px-4 py-5">{children}</div>
    </figure>
  );
}

/** Identity never rests on colour alone — every figure with 2+ marks has this. */
export function Legend({
  items,
}: {
  items: { color?: string; dashed?: boolean; label: string; value?: string }[];
}) {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-3 w-3 shrink-0 rounded-[3px]"
            style={
              it.dashed
                ? { border: `1.5px dashed ${MUTED}`, background: "#f3f2ef" }
                : { background: it.color }
            }
          />
          <span className={`text-[13px] text-stone-700 ${BN}`}>{it.label}</span>
          {it.value && (
            <span className="font-mono text-[12.5px] font-semibold text-stone-900">{it.value}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** ধাপ ০ — the whole loop as one strip, so the page has a spine. */
export function JourneyStrip({
  nodes,
}: {
  nodes: { k: string; title: string; money: string; where: string }[];
}) {
  const W = 150;
  const GAP = 22;
  const pitch = W + GAP;
  const total = nodes.length * pitch - GAP;

  return (
    <svg viewBox={`0 0 ${total} 132`} className="w-full min-w-[900px]" role="img">
      <title>ক্রয় আদেশ থেকে নিট লাভ পর্যন্ত টাকার চক্র</title>
      {nodes.map((n, i) => {
        const x = i * pitch;
        const last = i === nodes.length - 1;
        return (
          <g key={n.k}>
            <text
              x={x + W / 2}
              y={26}
              textAnchor="middle"
              className={`text-[11px] ${BN}`}
              fill={last ? GREEN : i === 0 ? RED : MUTED}
              fontWeight={last || i === 0 ? 700 : 400}
            >
              {n.money}
            </text>
            <rect
              x={x}
              y={40}
              width={W}
              height={54}
              rx={10}
              fill={last ? "#e6f6ef" : SURFACE}
              stroke={last ? GREEN : RULE}
              strokeWidth={last ? 1.5 : 1}
            />
            <text
              x={x + W / 2}
              y={60}
              textAnchor="middle"
              className="font-mono text-[9.5px]"
              fill={MUTED}
              letterSpacing="0.08em"
            >
              {n.k}
            </text>
            <text
              x={x + W / 2}
              y={80}
              textAnchor="middle"
              className={`text-[14px] font-bold ${BN}`}
              fill={INK}
            >
              {n.title}
            </text>
            <text
              x={x + W / 2}
              y={118}
              textAnchor="middle"
              className="font-mono text-[10px]"
              fill={MUTED}
            >
              {n.where}
            </text>
            {!last && (
              <g>
                <line
                  x1={x + W + 4}
                  y1={67}
                  x2={x + W + GAP - 9}
                  y2={67}
                  stroke={RULE}
                  strokeWidth={2}
                />
                <polygon
                  points={`${x + W + GAP - 9},63 ${x + W + GAP - 1},67 ${x + W + GAP - 9},71`}
                  fill="#d6d3cd"
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** ধাপ ০১ — the order's money split into goods and getting them here. */
export function CostSplitBar({
  parts,
  total,
}: {
  parts: { label: string; value: number }[];
  total: number;
}) {
  const W = 700;
  const BAR_H = 24;
  const y = 34;
  const GAP = 2;
  const fills = [GREEN, GREEN_SOFT];

  let cursor = 0;
  return (
    <svg viewBox={`0 0 ${W} 92`} className="w-full min-w-[520px]" role="img">
      <title>চালানের মোট খরচ — পণ্যের দাম ও মাল আনার খরচ</title>
      <text x={W} y={22} textAnchor="end" className={`text-[13px] font-bold ${BN}`} fill={INK}>
        {`মোট খরচ ${bnTaka(total)}`}
      </text>
      {parts.map((p, i) => {
        const last = i === parts.length - 1;
        const raw = (W * p.value) / total;
        const w = last ? raw : raw - GAP;
        const x = cursor;
        cursor += raw;
        return (
          <path
            key={p.label}
            d={barPath(x, y, w, BAR_H, last ? "right" : "bottom", last ? 4 : 0)}
            fill={fills[i % fills.length]}
          >
            <title>{`${p.label} — ${bnTaka(p.value)}`}</title>
          </path>
        );
      })}
      <line x1={0} y1={y + BAR_H + 8} x2={W} y2={y + BAR_H + 8} stroke={RULE} strokeWidth={1} />
      <text x={0} y={y + BAR_H + 24} className={`text-[11px] ${BN}`} fill={MUTED}>
        গুদামে ঢোকার মুহূর্তে এই পুরো টাকাটাই পণ্য হয়ে যায়
      </text>
    </svg>
  );
}

/** ধাপ ০২ — freight apportioned by value, one small multiple per line. */
export function LandedBars({
  rows,
}: {
  rows: { name: string; supplier: number; freight: number }[];
}) {
  const W = 700;
  const NAME_W = 190;
  const TIP_W = 90;
  const PLOT = W - NAME_W - TIP_W;
  const ROW_H = 52;
  const BAR_H = 20;
  const GAP = 2;
  const max = Math.max(...rows.map((r) => r.supplier + r.freight));

  return (
    <svg viewBox={`0 0 ${W} ${rows.length * ROW_H - 4}`} className="w-full min-w-[560px]" role="img">
      <title>প্রতিটি পণ্যের সাপ্লায়ার দাম ও ভাড়ার ভাগ মিলিয়ে আসল খরচ</title>
      {rows.map((r, i) => {
        const y = i * ROW_H + 14;
        const landed = r.supplier + r.freight;
        const wSupplier = (PLOT * r.supplier) / max - GAP;
        const wFreight = (PLOT * r.freight) / max;
        return (
          <g key={r.name}>
            <text
              x={0}
              y={y + BAR_H - 5}
              className={`text-[12.5px] ${BN}`}
              fill={TEXT}
            >
              {r.name}
            </text>
            <path d={barPath(NAME_W, y, wSupplier, BAR_H, "bottom", 0)} fill={GREEN}>
              <title>{`সাপ্লায়ার দাম ${bnTaka(r.supplier)}`}</title>
            </path>
            <path
              d={barPath(NAME_W + wSupplier + GAP, y, wFreight, BAR_H, "right")}
              fill={GREEN_SOFT}
            >
              <title>{`ভাড়ার ভাগ ${bnTaka(r.freight)}`}</title>
            </path>
            <text
              x={NAME_W + wSupplier + GAP + wFreight + 10}
              y={y + BAR_H - 5}
              className="font-mono text-[12.5px] font-bold"
              fill={INK}
            >
              {bnTaka(landed)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** ধাপ ০৩ — the publish gate. Stock alone does not put a product on sale. */
export function DraftGate() {
  const boxes = [
    { x: 0, w: 150, code: "DRAFT", cap: "ক্রেতা দেখে না", tone: "mute" as const },
    { x: 250, w: 180, code: "", cap: "", tone: "gate" as const },
    { x: 530, w: 150, code: "ACTIVE", cap: "ওয়েবসাইটে লাইভ", tone: "live" as const },
  ];

  return (
    <svg viewBox="0 0 700 182" className="w-full min-w-[560px]" role="img">
      <title>Draft থেকে Active — ছবি ও দাম ছাড়া পণ্য লাইভ হয় না</title>

      {/* Draft */}
      <rect x={0} y={44} width={150} height={52} rx={10} fill="#f3f2ef" stroke={RULE} />
      <text x={75} y={66} textAnchor="middle" className="font-mono text-[11px] font-bold" fill={MUTED}>
        {boxes[0].code}
      </text>
      <text x={75} y={84} textAnchor="middle" className={`text-[12px] ${BN}`} fill={TEXT}>
        {boxes[0].cap}
      </text>

      {/* Gate */}
      <rect x={250} y={30} width={180} height={80} rx={10} fill={SURFACE} stroke={AMBER} strokeWidth={1.5} />
      <text x={340} y={52} textAnchor="middle" className={`text-[12px] font-bold ${BN}`} fill={AMBER}>
        পেরোতে যা লাগে
      </text>
      <text x={340} y={74} textAnchor="middle" className={`text-[12.5px] ${BN}`} fill={INK}>
        অন্তত একটি ছবি
      </text>
      <text x={340} y={94} textAnchor="middle" className={`text-[12.5px] ${BN}`} fill={INK}>
        একটি দাম
      </text>

      {/* Active */}
      <rect x={530} y={44} width={150} height={52} rx={10} fill="#e6f6ef" stroke={GREEN} strokeWidth={1.5} />
      <text x={605} y={66} textAnchor="middle" className="font-mono text-[11px] font-bold" fill={GREEN}>
        {boxes[2].code}
      </text>
      <text x={605} y={84} textAnchor="middle" className={`text-[12px] ${BN}`} fill={TEXT}>
        {boxes[2].cap}
      </text>

      {/* Arrows */}
      <line x1={154} y1={70} x2={241} y2={70} stroke={RULE} strokeWidth={2} />
      <polygon points="241,66 249,70 241,74" fill="#d6d3cd" />
      <line x1={434} y1={70} x2={521} y2={70} stroke={GREEN} strokeWidth={2} />
      <polygon points="521,66 529,70 521,74" fill={GREEN} />

      {/* The failure path */}
      <path d="M340,110 v26 h-190" fill="none" stroke={RED} strokeWidth={1.5} strokeDasharray="4 4" />
      <polygon points="150,132 142,136 150,140" fill={RED} />
      <text x={352} y={134} className={`text-[12px] ${BN}`} fill={RED}>
        একটিও না থাকলে পণ্য Draft-ই থেকে যাবে
      </text>
      <text x={352} y={152} className={`text-[12px] ${BN}`} fill={MUTED}>
        স্টক পড়ে থাকবে, অথচ একটাও বিক্রি হবে না
      </text>
    </svg>
  );
}

/** ধাপ ০৪ — On hand splits into Reserved + Available; Incoming is not yours. */
export function StockBars({
  onHand,
  reserved,
  incoming,
}: {
  onHand: number;
  reserved: number;
  incoming: number;
}) {
  const W = 700;
  const LABEL_W = 128;
  const PLOT = 500;
  const unit = PLOT / Math.max(onHand, incoming);
  const BAR_H = 24;
  const GAP = 2;
  const available = onHand - reserved;

  const wReserved = reserved * unit - GAP;
  const wAvailable = available * unit;
  const xAvailable = LABEL_W + reserved * unit;

  return (
    <svg viewBox={`0 0 ${W} 168`} className="w-full min-w-[560px]" role="img">
      <title>On hand, Reserved, Available ও Incoming — একই পণ্যের চারটি সংখ্যা</title>

      {/* Bracket over the part the storefront may actually sell */}
      <path
        d={`M${xAvailable},30 v-8 h${wAvailable} v8`}
        fill="none"
        stroke={GREEN}
        strokeWidth={1}
      />
      <text
        x={xAvailable + wAvailable / 2}
        y={14}
        textAnchor="middle"
        className={`text-[11.5px] font-bold ${BN}`}
        fill={GREEN}
      >
        ওয়েবসাইটে ঠিক এতটুকুই বিক্রি হতে পারে
      </text>

      {/* On hand */}
      <text x={0} y={54} className="font-mono text-[12px] font-semibold" fill={INK}>
        On hand
      </text>
      <text x={0} y={70} className={`text-[12px] ${BN}`} fill={MUTED}>
        {`${bnNum(onHand)} পিস`}
      </text>
      <path d={barPath(LABEL_W, 38, wReserved, BAR_H, "bottom", 0)} fill={AMBER}>
        <title>{`Reserved ${bnNum(reserved)}`}</title>
      </path>
      <text
        x={LABEL_W + wReserved / 2}
        y={55}
        textAnchor="middle"
        className="font-mono text-[11px] font-semibold"
        fill={SURFACE}
      >
        {bnNum(reserved)}
      </text>
      <path d={barPath(xAvailable, 38, wAvailable, BAR_H, "right")} fill={GREEN}>
        <title>{`Available ${bnNum(available)}`}</title>
      </path>
      <text
        x={xAvailable + wAvailable / 2}
        y={55}
        textAnchor="middle"
        className="font-mono text-[11px] font-semibold"
        fill={SURFACE}
      >
        {bnNum(available)}
      </text>

      {/* Incoming — drawn as an outline, because it cannot be sold today */}
      <defs>
        <pattern id="ei-hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#f3f2ef" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#d6d3cd" strokeWidth="2" />
        </pattern>
      </defs>
      <text x={0} y={110} className="font-mono text-[12px] font-semibold" fill={MUTED}>
        Incoming
      </text>
      <text x={0} y={126} className={`text-[12px] ${BN}`} fill={MUTED}>
        {`${bnNum(incoming)} পিস`}
      </text>
      <rect
        x={LABEL_W}
        y={94}
        width={incoming * unit}
        height={BAR_H}
        rx={4}
        fill="url(#ei-hatch)"
        stroke={MUTED}
        strokeWidth={1}
        strokeDasharray="4 3"
      >
        <title>{`Incoming ${bnNum(incoming)}`}</title>
      </rect>
      <text
        x={LABEL_W + (incoming * unit) / 2}
        y={111}
        textAnchor="middle"
        className="font-mono text-[11px] font-semibold"
        fill={TEXT}
      >
        {bnNum(incoming)}
      </text>
      <text x={LABEL_W + incoming * unit + 12} y={111} className={`text-[12px] ${BN}`} fill={MUTED}>
        পথে আছে — আজ বিক্রি করা যায় না
      </text>

      <line x1={0} y1={144} x2={W} y2={144} stroke={RULE} strokeWidth={1} />
      <text x={0} y={160} className={`text-[11.5px] ${BN}`} fill={MUTED}>
        {`Available = On hand − Reserved = ${bnNum(onHand)} − ${bnNum(reserved)} = ${bnNum(available)}`}
      </text>
    </svg>
  );
}

/** ধাপ ০৫ — the order's states, and the one moment money is recognised. */
export function OrderRail({
  states,
}: {
  states: {
    code: string;
    stock: [string, string];
    money: [string, string];
    isMoneyMoment?: boolean;
    isReversal?: boolean;
  }[];
}) {
  const GUTTER = 126;
  const COL = 170;
  const GAP = 8;
  const W = GUTTER + states.length * (COL + GAP) - GAP;
  const H = 214;

  const xOf = (i: number) => GUTTER + i * (COL + GAP);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[900px]" role="img">
      <title>অর্ডারের প্রতিটি ধাপে স্টকে ও হিসাবের খাতায় কী হয়</title>

      {/* Lane rules */}
      {[62, 130, 198].map((y) => (
        <line key={y} x1={0} y1={y} x2={W} y2={y} stroke={RULE} strokeWidth={1} />
      ))}
      <text x={GUTTER - 16} y={94} textAnchor="end" className={`text-[12px] font-bold ${BN}`} fill={TEXT}>
        স্টকে কী হয়
      </text>
      <text x={GUTTER - 16} y={162} textAnchor="end" className={`text-[12px] font-bold ${BN}`} fill={TEXT}>
        হিসাবের খাতায়
      </text>

      {states.map((s, i) => {
        const x = xOf(i);
        const accent = s.isMoneyMoment ? GREEN : s.isReversal ? RED : MUTED;
        return (
          <g key={s.code}>
            {s.isMoneyMoment && <rect x={x} y={130} width={COL} height={68} fill="#e6f6ef" />}
            <rect
              x={x}
              y={14}
              width={COL}
              height={34}
              rx={8}
              fill={s.isMoneyMoment ? GREEN : SURFACE}
              stroke={s.isMoneyMoment ? GREEN : s.isReversal ? "#f3c9c9" : RULE}
              strokeWidth={1}
            />
            <text
              x={x + COL / 2}
              y={36}
              textAnchor="middle"
              className="font-mono text-[12px] font-bold"
              fill={s.isMoneyMoment ? SURFACE : s.isReversal ? RED : TEXT}
              letterSpacing="0.04em"
            >
              {s.code}
            </text>

            {s.stock.map((line, li) =>
              line ? (
                <text
                  key={li}
                  x={x + COL / 2}
                  y={86 + li * 17}
                  textAnchor="middle"
                  className={`text-[12px] ${BN}`}
                  fill={TEXT}
                >
                  {line}
                </text>
              ) : null,
            )}

            {s.money.map((line, li) =>
              line ? (
                <text
                  key={li}
                  x={x + COL / 2}
                  y={154 + li * 17}
                  textAnchor="middle"
                  className={`text-[12px] ${s.isMoneyMoment ? "font-bold" : ""} ${BN}`}
                  fill={s.isMoneyMoment ? GREEN : s.isReversal ? RED : MUTED}
                >
                  {line}
                </text>
              ) : null,
            )}

            {i < states.length - 1 && (
              <polygon
                points={`${x + COL + 1},27 ${x + COL + 7},31 ${x + COL + 1},35`}
                fill={accent === MUTED ? "#d6d3cd" : accent}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}


/**
 * ধাপ ০৬, ০৭ ও ০৮ — the waterfall.
 *
 * Every column is labelled with its own signed value, so the chart needs no
 * y-axis and no gridlines; the sign on the label is the secondary encoding that
 * keeps red/green from being the only thing telling a cost from a total.
 *
 * Tops and bottoms are derived from ONE running balance rather than typed in
 * twice, and a total column reads its figure back off that balance — so a
 * column can never be drawn at one height and labelled with another. The scale
 * spans the running balance's real range, which is what lets the cash-flow
 * chart end below zero instead of overflowing its own frame.
 */
export function Waterfall({ bars, label }: { bars: WfBar[]; label: string }) {
  const BAR_W = 24;
  const PLOT_TOP = 36;
  const PLOT_H = 180;
  const BAND = bars.length <= 3 ? 150 : 112;
  const W = bars.length * BAND;

  let running = 0;
  const spans = bars.map((b) => {
    let top: number;
    let bottom: number;
    if (b.kind === "start" || b.kind === "up") {
      bottom = b.kind === "up" ? running : 0;
      top = bottom + b.value;
      running = top;
    } else if (b.kind === "down") {
      top = running;
      bottom = running - b.value;
      running = bottom;
    } else {
      // A subtotal restates the balance: it is drawn from zero, and its own
      // figure comes from the balance rather than from the data.
      top = Math.max(running, 0);
      bottom = Math.min(running, 0);
    }
    const signed = b.kind === "down" ? -b.value : b.kind === "start" || b.kind === "up" ? b.value : running;
    return { ...b, top, bottom, signed, after: running };
  });

  const domainMax = Math.max(0, ...spans.map((s) => s.top));
  const domainMin = Math.min(0, ...spans.map((s) => s.bottom));
  const span = domainMax - domainMin || 1;
  const yOf = (v: number) => PLOT_TOP + (PLOT_H * (domainMax - v)) / span;

  // A column that ends below zero needs its figure under the bar, which means
  // the axis labels have to step out of the way for the whole chart.
  const hasNegative = domainMin < 0;
  const axisY = PLOT_TOP + PLOT_H + (hasNegative ? 42 : 22);
  const H = axisY + 34;
  const zeroY = yOf(0);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", maxWidth: W + 160, minWidth: Math.min(W, 520) }}
      role="img"
    >
      <title>{label}</title>
      <line x1={0} y1={zeroY} x2={W} y2={zeroY} stroke={RULE} strokeWidth={1} />
      {spans.map((s, i) => {
        const cx = i * BAND + BAND / 2;
        const x = cx - BAR_W / 2;
        const yTop = yOf(s.top);
        const h = Math.max(2, yOf(s.bottom) - yTop);
        const isCost = s.kind === "down";
        const isTotal = s.kind === "subtotal" || s.kind === "final";
        const below = s.signed < 0 && isTotal;
        const negative = isCost || below;
        const fill = s.kind === "final" ? (below ? RED : GREEN) : isCost ? RED : isTotal ? TEXT : INK;
        const figure = `${negative ? "− " : ""}${bnTaka(Math.abs(s.signed))}`;

        return (
          <g key={`${s.label[0]}-${i}`}>
            {/* Connector sits at the balance the previous column left behind */}
            {i > 0 && (
              <line
                x1={(i - 1) * BAND + BAND / 2 + BAR_W / 2}
                y1={yOf(spans[i - 1].after)}
                x2={x}
                y2={yOf(spans[i - 1].after)}
                stroke="#d6d3cd"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            )}
            <path d={barPath(x, yTop, BAR_W, h, negative ? "bottom" : "top")} fill={fill}>
              <title>{`${s.label.filter(Boolean).join(" ")} — ${figure}`}</title>
            </path>
            <text
              x={cx}
              y={below ? yOf(s.bottom) + 18 : yTop - 9}
              textAnchor="middle"
              className={`text-[12px] font-bold ${BN}`}
              fill={negative ? RED : s.kind === "final" ? GREEN : INK}
            >
              {figure}
            </text>
            {s.label.map((line, li) =>
              line ? (
                <text
                  key={li}
                  x={cx}
                  y={axisY + li * 16}
                  textAnchor="middle"
                  className={`text-[12px] ${isTotal ? "font-bold" : ""} ${BN}`}
                  fill={isTotal ? INK : MUTED}
                >
                  {line}
                </text>
              ) : null,
            )}
          </g>
        );
      })}
    </svg>
  );
}
