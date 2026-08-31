// Data for the illustrated inventory guide (/admin/guide/easy-inventory).
//
// The written guide at /admin/guide answers "which button do I press". This
// page answers the question underneath it — "where did my money go, and did I
// make any" — by drawing it. So the content here is numbers first: every figure
// below feeds a diagram in ./diagrams.tsx, and the prose only names what the
// picture already shows.
//
// One worked example runs through the whole page (PO-0042, the same order used
// in the written guide) so the reader can follow a single ৳1,15,000 from the
// supplier's invoice to the month's ৳35,380 of profit. Changing a number here
// changes the drawing; nothing is hard-coded in the SVG.

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

/**
 * Bangla numerals with Bangladeshi grouping (1,15,000 — not 115,000).
 * Every figure on the page goes through here so the drawings and the prose
 * can never disagree about how a number is written.
 */
export function bnNum(n: number): string {
  const negative = n < 0;
  const digits = Math.abs(Math.round(n)).toString();

  let grouped = digits;
  if (digits.length > 3) {
    const last3 = digits.slice(-3);
    let rest = digits.slice(0, -3);
    const groups: string[] = [];
    while (rest.length > 2) {
      groups.unshift(rest.slice(-2));
      rest = rest.slice(0, -2);
    }
    if (rest) groups.unshift(rest);
    grouped = `${groups.join(",")},${last3}`;
  }

  const bangla = grouped.replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
  return negative ? `−${bangla}` : bangla;
}

export const bnTaka = (n: number): string => `৳${bnNum(n)}`;

// ── The journey strip ───────────────────────────────────────────────────────

export interface JourneyNode {
  /** Latin key, shown small above the Bangla title. */
  k: string;
  title: string;
  /** The money reading at this point in the loop. */
  money: string;
  /** Which admin screen this node lives on. */
  where: string;
}

export const JOURNEY: JourneyNode[] = [
  { k: "PO", title: "ক্রয় আদেশ", money: `− ${bnTaka(115000)}`, where: "Purchase Orders" },
  { k: "STOCK", title: "মাল গুদামে", money: `${bnTaka(115000)} এখন পণ্য`, where: "Stock Overview" },
  { k: "LIVE", title: "পণ্য লাইভ", money: "বিক্রির জন্য প্রস্তুত", where: "Products" },
  { k: "ORDER", title: "অর্ডার এল", money: "মাল Reserved", where: "Orders" },
  { k: "DELIVERED", title: "ডেলিভারি", money: `+ ${bnTaka(1200)} প্রতি অর্ডারে`, where: "Orders" },
  { k: "PROFIT", title: "নিট লাভ", money: `+ ${bnTaka(35380)} এই মাসে`, where: "Profit & Loss" },
];

// ── ধাপ ১ · চালানের মোট খরচ ─────────────────────────────────────────────────

export const PO_SPLIT = {
  poNo: "PO-0042",
  supplier: "রহমান টেক্সটাইল",
  parts: [
    { label: "পণ্যের দাম", value: 109000 },
    { label: "ভাড়া ও কাস্টমস", value: 6000 },
  ],
  total: 115000,
};

// ── ধাপ ২ · ভাড়া ভাগ হয়ে আসল খরচ ───────────────────────────────────────────

export interface LandedRow {
  name: string;
  /** What the supplier charged per piece. */
  supplier: number;
  /** This piece's share of the order's freight + customs. */
  freight: number;
}

export const LANDED: LandedRow[] = [
  { name: "কটন পাঞ্জাবি — নেভি / L", supplier: 820, freight: 45 },
  { name: "কটন পাঞ্জাবি — নেভি / M", supplier: 820, freight: 45 },
  { name: "লিনেন শার্ট — সাদা / M", supplier: 540, freight: 30 },
];

// ── ধাপ ৪ · স্টকের চারটি সংখ্যা ─────────────────────────────────────────────

export const STOCK = {
  onHand: 100,
  reserved: 12,
  /** Ordered from the supplier, not arrived — deliberately NOT sellable. */
  incoming: 40,
};

// ── ধাপ ৫ · অর্ডারের যাত্রা ─────────────────────────────────────────────────

export interface OrderState {
  code: string;
  /** Two short lines, so the label never has to wrap unpredictably in SVG. */
  stock: [string, string];
  money: [string, string];
  /** The one state where revenue and COGS are recognised. */
  isMoneyMoment?: boolean;
  isReversal?: boolean;
}

export const ORDER_STATES: OrderState[] = [
  {
    code: "PENDING",
    stock: ["মাল Reserved", "On hand অপরিবর্তিত"],
    money: ["কিছুই ধরা", "হয় না"],
  },
  {
    code: "CONFIRMED",
    stock: ["ফোনে নিশ্চিত", "এখনো Reserved"],
    money: ["কিছুই ধরা", "হয় না"],
  },
  {
    code: "SHIPPED",
    stock: ["On hand ও Reserved কমে", "লেজারে SALE লেখা হয়"],
    money: ["কিছুই ধরা", "হয় না"],
  },
  {
    code: "DELIVERED",
    stock: ["মাল চিরতরে গেল", ""],
    money: ["আয় ও COGS", "এখানে ধরা হয়"],
    isMoneyMoment: true,
  },
  {
    code: "RETURNED",
    stock: ["অক্ষত হলে ফেরত", "নষ্ট হলে ক্ষতি"],
    money: ["আয় ফেরত", "যায়"],
    isReversal: true,
  },
];

// ── ধাপ ৬ ও ৭ · লাভের ঝরনা (waterfall) ──────────────────────────────────────

export type WfKind = "start" | "down" | "up" | "subtotal" | "final";

export interface WfBar {
  /** Two lines under the column; the second may be empty. */
  label: [string, string];
  value: number;
  kind: WfKind;
}

/** One delivered order of one punjabi — where its ৳1,200 actually goes. */
export const ORDER_WATERFALL: WfBar[] = [
  { label: ["বিক্রয়মূল্য", ""], value: 1200, kind: "start" },
  { label: ["পণ্যের খরচ", "(আসল খরচ)"], value: 865, kind: "down" },
  { label: ["কুরিয়ার", "খরচ"], value: 120, kind: "down" },
  { label: ["প্যাকেজিং", ""], value: 30, kind: "down" },
  { label: ["বিজ্ঞাপনের", "ভাগ"], value: 90, kind: "down" },
  { label: ["নিট লাভ", "এই অর্ডারে"], value: 95, kind: "final" },
];

/** The monthly P&L, same shape as /admin/reports/finance. */
export const MONTH_WATERFALL: WfBar[] = [
  { label: ["মোট বিক্রি", ""], value: 486300, kind: "start" },
  { label: ["কুপন ছাড়", ""], value: 18400, kind: "down" },
  { label: ["ফেরত", ""], value: 21900, kind: "down" },
  { label: ["নিট আয়", ""], value: 446000, kind: "subtotal" },
  { label: ["পণ্যের খরচ", "COGS"], value: 281000, kind: "down" },
  { label: ["মোট লাভ", ""], value: 165000, kind: "subtotal" },
  { label: ["পরিচালন", "খরচ"], value: 129620, kind: "down" },
  { label: ["নিট লাভ", ""], value: 35380, kind: "final" },
];

/** Why a profitable month can still leave the till empty. */
export const CASH_WATERFALL: WfBar[] = [
  { label: ["খাতার", "নিট লাভ"], value: 35380, kind: "start" },
  { label: ["নতুন স্টক", "কেনা হলো"], value: 80000, kind: "down" },
  { label: ["হাতের টাকা", "কমল"], value: 44620, kind: "final" },
];

// ── প্রতিটি ধাপের বর্ণনা ─────────────────────────────────────────────────────

export interface Section {
  numeral: string;
  eyebrow: string;
  heading: string;
  lede: string;
  /** Read the picture out loud — what the reader should take from it. */
  readings: string[];
  callout?: string;
  links?: { href: string; label: string }[];
}

export const SECTIONS: Record<string, Section> = {
  buy: {
    numeral: "০১",
    eyebrow: "টাকা → পণ্য",
    heading: "প্রথমে টাকা বেরোয়",
    lede:
      "সাপ্লায়ারকে দেওয়া দাম-ই চালানের একমাত্র খরচ নয়। মাল আনতে যে ভাড়া ও কাস্টমস লাগে, সেটাও ওই মালেরই খরচ। দুটো একসাথে না ধরলে পণ্য কত দিয়ে কেনা হলো তা কখনোই ঠিক জানা যাবে না।",
    readings: [
      `${PO_SPLIT.poNo}-এ পণ্যের দাম ${bnTaka(109000)}, আর মাল আনার খরচ ${bnTaka(6000)}।`,
      `গুদামে ঢোকার সময় এই চালানের মোট খরচ ${bnTaka(115000)} — এটাই আপনার আটকে যাওয়া পুঁজি।`,
      "ভাড়ার অংশটা ছোট দেখাচ্ছে, কিন্তু এটাই প্রতি পিসের লাভ-লোকসান ঠিক করে দেয়।",
    ],
    links: [
      { href: "/admin/inventory/purchase-orders/new", label: "নতুন ক্রয় আদেশ" },
      { href: "/admin/inventory/suppliers", label: "সাপ্লায়ার তালিকা" },
    ],
  },
  landed: {
    numeral: "০২",
    eyebrow: "আসল খরচ",
    heading: "ভাড়া ভাগ হয়ে প্রতি পিসের খরচ দাঁড়ায়",
    lede:
      "মাল বুঝে নেওয়ার সময় প্যানেল পুরো চালানের ভাড়া ও কাস্টমস পণ্যগুলোর মধ্যে ভাগ করে দেয় — মূল্য অনুপাতে। দামি পণ্য বেশি ভাড়া বহন করে, সস্তা পণ্য কম। এর পরের সংখ্যাটাই ওই পণ্যের আসল খরচ।",
    readings: [
      `পাঞ্জাবির সাপ্লায়ার দাম ${bnTaka(820)}, ভাড়ার ভাগ ${bnTaka(45)} — আসল খরচ ${bnTaka(865)}।`,
      `শার্টের দাম কম, তাই ভাড়ার ভাগও কম — ${bnTaka(540)} + ${bnTaka(30)} = ${bnTaka(570)}।`,
      "এই আসল খরচই পণ্যের Sourcing cost হিসেবে বসে যায়, আর সব লাভের হিসাব এখান থেকেই হয়।",
    ],
    callout: `পাঞ্জাবিটি ${bnTaka(1200)} টাকায় বিক্রি করলে আপনার লাভ ${bnTaka(335)}, ${bnTaka(380)} নয়। ভাড়া বাদ দিলে প্রতিটি পিসেই লাভ বেশি দেখাবে — আর যত বেশি বিক্রি, ভুল তত বড় হবে।`,
    links: [{ href: "/admin/inventory/purchase-orders", label: "ক্রয় আদেশ তালিকা" }],
  },
  live: {
    numeral: "০৩",
    eyebrow: "গুদাম → দোকান",
    heading: "মাল থাকলেই বিক্রি হয় না — পণ্য লাইভ করতে হয়",
    lede:
      "ক্রয় আদেশ থেকে তৈরি পণ্য Draft অবস্থায় থাকে। ছবি ও দাম না বসানো পর্যন্ত প্যানেল সেটিকে ওয়েবসাইটে উঠতেই দেবে না — আর ক্রেতা যা দেখে না, তা কেনেও না।",
    readings: [
      "Draft — PO থেকে সদ্য তৈরি, ক্রেতা দেখে না।",
      "গেট পেরোতে দুটো জিনিস লাগে: অন্তত একটি ছবি, আর একটি দাম।",
      "Active — ওয়েবসাইটে দেখা যাচ্ছে। Hidden — তৈরি, কিন্তু ইচ্ছে করে বন্ধ রাখা।",
    ],
    callout:
      "গুদামে ৳১,১৫,০০০-এর মাল অথচ বিক্রি শূন্য — নতুন অ্যাডমিনের সবচেয়ে সাধারণ সমস্যাটি এখানেই। পণ্য তালিকায় Draft ফিল্টার দিয়ে দেখে নিন কোনগুলো আটকে আছে।",
    links: [{ href: "/admin/products", label: "পণ্য তালিকা" }],
  },
  stock: {
    numeral: "০৪",
    eyebrow: "গুদামের হিসাব",
    heading: "একই পণ্যের চারটি সংখ্যা",
    lede:
      "স্টক একটি সংখ্যা নয়, চারটি। কোনটা কী বোঝায় তা না জানলে মনে হবে প্যানেল ভুল বলছে — অথচ প্রতিটি সংখ্যার আলাদা কাজ আছে।",
    readings: [
      `On hand ${bnNum(STOCK.onHand)} — গুদামে বাস্তবে যত পিস আছে।`,
      `Reserved ${bnNum(STOCK.reserved)} — অর্ডার হয়ে গেছে, এখনো পাঠানো হয়নি।`,
      `Available ${bnNum(STOCK.onHand - STOCK.reserved)} — ওয়েবসাইটে ঠিক এতটুকুই বিক্রি হতে পারে।`,
      `Incoming ${bnNum(STOCK.incoming)} — সাপ্লায়ারকে অর্ডার দেওয়া, এখনো আসেনি। এটা আজ বিক্রি করা যায় না।`,
    ],
    callout:
      "Available শূন্য হলে পণ্যটি Out — পথে ৪০ পিস থাকলেও। লরির মাল আজ কারও হাতে দেওয়া যায় না, তাই প্যানেল সেটিকে বিক্রয়যোগ্য ধরে না।",
    links: [
      { href: "/admin/inventory", label: "স্টক তালিকা" },
      { href: "/admin/inventory/movements", label: "স্টক লেজার" },
    ],
  },
  sell: {
    numeral: "০৫",
    eyebrow: "পণ্য → টাকা",
    heading: "অর্ডার থেকে টাকা — কোন ধাপে কী হয়",
    lede:
      "অর্ডার হওয়া আর টাকা পাওয়া এক নয়। ক্যাশ অন ডেলিভারিতে টাকা আসে তখনই, যখন কুরিয়ার ক্রেতার হাতে মাল দেয়। তাই প্যানেল আয়ের হিসাব ডেলিভারির সাথে বেঁধে রাখে, অর্ডারের ক্লিকের সাথে নয়।",
    readings: [
      "উপরের সারি — স্টকে কী হয়। নিচের সারি — হিসাবের খাতায় কী হয়।",
      "খেয়াল করুন, প্রথম তিন ধাপে হিসাবের খাতায় কিছুই হয় না।",
      "DELIVERED — এখানেই আয় আর পণ্যের খরচ (COGS) দুটোই ধরা হয়।",
      "ফেরত এলে আয় ফিরে যায়; মাল অক্ষত থাকলে স্টকে ফেরে, নষ্ট হলে লোকসান।",
    ],
    links: [
      { href: "/admin/orders", label: "অর্ডার তালিকা" },
      { href: "/admin/returns", label: "ফেরত অনুরোধ" },
    ],
  },
  unit: {
    numeral: "০৬",
    eyebrow: "একটি অর্ডার",
    heading: "একটি বিক্রিতে লাভ আসলে কত",
    lede:
      "১,২০০ টাকায় বিক্রি হলো মানে ১,২০০ টাকা লাভ নয়। প্রতিটি খরচ ওই টাকার ভেতর থেকেই কাটা যায় — যা পড়ে থাকে সেটাই আপনার।",
    readings: [
      `বিক্রয়মূল্য ${bnTaka(1200)} দিয়ে শুরু।`,
      `পণ্যের আসল খরচ ${bnTaka(865)} — সবচেয়ে বড় কামড় এটাই।`,
      `কুরিয়ার, প্যাকেজিং আর বিজ্ঞাপন মিলে আরও ${bnTaka(240)}।`,
      `হাতে থাকে ${bnTaka(95)} — বিক্রয়মূল্যের প্রায় আট ভাগ।`,
    ],
    callout:
      "একটা পিসে ৳৯৫ লাভ মানে একটা ফেরত অর্ডারের ক্ষতি পোষাতে প্রায় ১৩টি সফল অর্ডার লাগে। এই কারণেই ফেরতের হার কমানো বাড়তি ছাড় দেওয়ার চেয়ে বেশি লাভজনক।",
  },
  month: {
    numeral: "০৭",
    eyebrow: "মাস শেষে",
    heading: "পুরো মাসের লাভ-লোকসান",
    lede:
      "উপরের এক অর্ডারের হিসাবটাই মাসের সব অর্ডারের জন্য একসাথে করলে যা দাঁড়ায় — এটিই Profit & Loss রিপোর্ট। বাঁ দিক থেকে ডান দিকে পড়ুন, প্রতিটি লাল স্তম্ভ একেকটি কামড়।",
    readings: [
      `এই মাসে ডেলিভারি হওয়া পণ্যের মূল্য ${bnTaka(486300)}।`,
      `কুপন ছাড় ও ফেরত বাদ দিয়ে নিট আয় ${bnTaka(446000)}।`,
      `পণ্যের খরচ (COGS) ${bnTaka(281000)} বাদ দিলে মোট লাভ ${bnTaka(165000)}।`,
      `কুরিয়ার, বিজ্ঞাপন, বেতন, ভাড়া — সব পরিচালন খরচ ${bnTaka(129620)} বাদে নিট লাভ ${bnTaka(35380)}।`,
    ],
    callout:
      "ভাড়া, বেতন আর বিজ্ঞাপনের খরচ প্যানেল নিজে থেকে জানে না — আপনাকে লিখে দিতে হয়। না লিখলে ওই টাকাটা লাভ হিসেবে দেখাবে, আর আপনি ভাববেন ব্যবসা যা করছে তার চেয়ে ভালো করছে।",
    links: [
      { href: "/admin/reports/finance", label: "লাভ-লোকসান রিপোর্ট" },
      { href: "/admin/reports/finance/expenses/new", label: "নতুন খরচ" },
      { href: "/admin/reports/finance/ad-spend/new", label: "নতুন বিজ্ঞাপন খরচ" },
    ],
  },
  cash: {
    numeral: "০৮",
    eyebrow: "শেষ কথা",
    heading: "লাভ আর হাতের টাকা এক জিনিস নয়",
    lede:
      "মাস শেষে ৳৩৫,৩৮০ লাভ দেখাচ্ছে, অথচ ক্যাশবাক্স খালি — এটা ভুল হিসাব নয়। লাভটা পণ্য হয়ে গুদামে বসে আছে। এই পার্থক্যটাই Cash Flow রিপোর্ট দেখায়।",
    readings: [
      `খাতায় নিট লাভ ${bnTaka(35380)}।`,
      `কিন্তু এই মাসেই নতুন স্টক কিনতে গেছে ${bnTaka(80000)}।`,
      `ফলে হাতের টাকা কমেছে ${bnTaka(44620)} — লাভ করেও।`,
      "টাকাটা হারায়নি; সেটা এখন গুদামে পণ্য হয়ে আছে, বিক্রি হলে আবার ফিরবে।",
    ],
    links: [
      { href: "/admin/reports/cashflow", label: "ক্যাশ ফ্লো" },
      { href: "/admin/reports/suppliers", label: "সাপ্লায়ারভিত্তিক লাভ" },
    ],
  },
};

/** The four mistakes that silently corrupt every number drawn above. */
export const MISTAKES: { wrong: string; effect: string; right: string }[] = [
  {
    wrong: "PO না লিখে হাতে স্টক বাড়ানো",
    effect: "পণ্যের খরচ শূন্য ধরা হয় — প্রতিটি বিক্রি পুরোটাই লাভ দেখায়",
    right: "প্রতিটি চালান PO দিয়ে রিসিভ করুন",
  },
  {
    wrong: "PO-তে চালানের খরচ না লেখা",
    effect: "প্রতি পিসে লাভ বাস্তবের চেয়ে বেশি দেখায়",
    right: "ভাড়া, কাস্টমস, লেবার ও বিবিধ — যেটা এই চালানে লেগেছে সেটাই লিখুন",
  },
  {
    wrong: "দেরিতে Delivered চিহ্ন দেওয়া",
    effect: "বিক্রি ভুল মাসের খাতায় চলে যায়",
    right: "কুরিয়ার নিশ্চিত করলেই চিহ্ন দিন",
  },
  {
    wrong: "নষ্ট মালকে Adjustment লেখা",
    effect: "সত্যিকারের লোকসান হিসাব থেকে অদৃশ্য হয়ে যায়",
    right: "নষ্ট হলে Damage, গণনার ভুল হলে Adjustment",
  },
];
