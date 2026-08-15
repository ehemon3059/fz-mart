// Content for the Bangla operating guide (/admin/guide).
//
// Kept as data rather than inline JSX so the page component stays a thin
// renderer: adding a stage, a step or a link is a data edit, and the five
// stages can't drift apart in markup. Every `href` here is a real admin route —
// they are rendered as internal <Link>s, so a typo is a broken link inside the
// panel, not a 404 on a marketing site.

export interface GuideStep {
  title: string;
  detail?: string;
  /** Field labels exactly as they appear in the form, left in English. */
  fields?: string[];
  /** The button the admin presses to finish the step. */
  action?: string;
  links?: { href: string; label: string }[];
}

export interface GuideTable {
  caption?: string;
  head: string[];
  /** `align` marks columns rendered right-aligned + tabular. */
  align?: ("left" | "right")[];
  rows: GuideCell[][];
}

export interface GuideCell {
  text: string;
  /** Renders as a status pill instead of plain text. */
  chip?: "ok" | "warn" | "bad" | "mute";
  /** Monospace — used for stock states and ledger types. */
  mono?: boolean;
  bold?: boolean;
  /** Colour a bare +/− sign in the ledger table. */
  tone?: "in" | "out" | "muted";
  /** Renders a `colspan` cell (P&L subtotal rows). */
  span?: number;
}

export interface GuideStage {
  /** Bangla numeral shown in the rail. */
  numeral: string;
  railTop: string;
  railBottom: string;
  heading: string;
  lede: string;
  steps?: GuideStep[];
  /** Left = what the admin does, right = what the panel does. */
  doPanel?: { you: string[]; panel: string[] };
  formula?: { label: string; body: string }[];
  tables?: GuideTable[];
  /** Free paragraphs rendered after the tables. */
  notes?: string[];
  callout?: string;
  links?: { href: string; label: string }[];
}

export const LOOP_NODES = [
  { k: "CASH", t: "ক্রয় আদেশ", s: "টাকা বেরিয়ে গেল" },
  { k: "GOODS", t: "স্টকে পণ্য", s: "পুঁজি এখন গুদামে" },
  { k: "RESERVED", t: "অর্ডার হয়েছে", s: "বিক্রি, কিন্তু পাঠানো হয়নি" },
  { k: "DELIVERED", t: "ডেলিভারি সম্পন্ন", s: "ক্যাশ অন ডেলিভারিতে টাকা এল" },
  { k: "PROFIT", t: "নিট লাভ", s: "যা আসলে থেকে গেল" },
];

export const STAGES: GuideStage[] = [
  // ── ধাপ ১ ─────────────────────────────────────────────
  {
    numeral: "০১",
    railTop: "টাকা বেরোয়",
    railBottom: "সাপ্লায়ার",
    heading: "সাপ্লায়ার থেকে পণ্য কিনুন",
    lede:
      "আপনার প্রতিটি পণ্য একটি ক্রয় আদেশ (Purchase Order / PO) দিয়ে দোকানে ঢোকে। PO-তে থাকে কোন সাপ্লায়ার, কী কী পণ্য, কত দরে, আর মাল আনতে কত ভাড়া লেগেছে।",
    steps: [
      {
        title: "প্রথমে সাপ্লায়ার তালিকা দেখুন",
        detail: "তালিকায় সাপ্লায়ারের নাম, ফোন এবং লিড টাইম দেখা যাবে।",
        links: [{ href: "/admin/inventory/suppliers", label: "সাপ্লায়ার তালিকা" }],
      },
      {
        title: "সাপ্লায়ার না থাকলে নতুন যোগ করুন",
        detail: "ফর্মটি পূরণ করে সেভ করুন।",
        fields: ["Name", "Phone", "Email", "Address", "Lead time (days)", "Status", "Note"],
        action: "Save supplier",
        links: [{ href: "/admin/inventory/suppliers/new", label: "নতুন সাপ্লায়ার" }],
      },
      {
        title: "লিড টাইম অবশ্যই দিন",
        detail:
          "অর্ডার দেওয়ার পর মাল আসতে কত দিন লাগে — সেই সংখ্যাটি। এটি দিয়েই প্যানেল হিসাব করে কখন আবার অর্ডার দিতে হবে। খালি রাখলে দোকানের ডিফল্ট ৭ দিন ধরা হয়।",
      },
      {
        title: "এবার নতুন ক্রয় আদেশ তৈরি করুন",
        detail:
          "উপরে সাপ্লায়ার ও তারিখ দিন, তারপর প্রতিটি লাইনে পণ্য ও দর বসান। নিচে পুরো চালানের ভাড়া ও কাস্টমস খরচ দিন।",
        fields: [
          "Supplier",
          "Expected on",
          "Product",
          "Option",
          "Quantity",
          "Unit cost ৳",
          "Freight ৳",
          "Customs / clearing ৳",
        ],
        action: "Create draft",
        links: [
          { href: "/admin/inventory/purchase-orders", label: "ক্রয় আদেশ তালিকা" },
          { href: "/admin/inventory/purchase-orders/new", label: "নতুন ক্রয় আদেশ" },
        ],
      },
      {
        title: "সাপ্লায়ারকে অর্ডার দেওয়ার পর Place order চাপুন",
        detail:
          "তখন থেকে ওই পণ্যগুলো Incoming (পথে আছে) হিসেবে গণনা হবে। ভুল হলে Cancel order দিয়ে বাতিল করা যাবে।",
      },
    ],
    doPanel: {
      you: [
        "সাপ্লায়ার বাছাই ও লিড টাইম সেট করা।",
        "পণ্য, পরিমাণ ও ক্রয়মূল্য লেখা।",
        "চালানের ভাড়া ও কাস্টমস খরচ লেখা।",
        "অর্ডার দেওয়ার পর Place order চাপা।",
      ],
      panel: [
        "PO-0042 এর মতো একটি নম্বর দেবে।",
        "না-আসা পণ্য Incoming দেখাবে — দেখা যাবে, কিন্তু বিক্রি হবে না।",
        "যে পণ্য ইতিমধ্যে অর্ডার করা, তার জন্য বারবার সতর্কবার্তা দেবে না।",
        "পণ্যের নাম PO-তে সংরক্ষণ করে রাখবে, পরে নাম বদলালেও পুরোনো কাগজ বদলাবে না।",
      ],
    },
    tables: [
      {
        caption: "উদাহরণ · PO-0042 · রহমান টেক্সটাইল · আসবে ২৪ আগস্ট",
        head: ["পণ্য", "পরিমাণ", "ক্রয়মূল্য", "মোট"],
        align: ["left", "right", "right", "right"],
        rows: [
          [
            { text: "কটন পাঞ্জাবি — নেভি / L" },
            { text: "৬০" },
            { text: "৳৮২০" },
            { text: "৳৪৯,২০০" },
          ],
          [
            { text: "কটন পাঞ্জাবি — নেভি / M" },
            { text: "৪০" },
            { text: "৳৮২০" },
            { text: "৳৩২,৮০০" },
          ],
          [
            { text: "লিনেন শার্ট — সাদা / M" },
            { text: "৫০" },
            { text: "৳৫৪০" },
            { text: "৳২৭,০০০" },
          ],
          [
            { text: "পণ্যের মূল্য", bold: true, span: 3 },
            { text: "৳১,০৯,০০০", bold: true },
          ],
          [{ text: "ভাড়া + কাস্টমস", span: 3 }, { text: "৳৬,০০০" }],
          [
            { text: "মোট খরচ", bold: true, span: 3 },
            { text: "৳১,১৫,০০০", bold: true },
          ],
        ],
      },
    ],
  },

  // ── ধাপ ২ ─────────────────────────────────────────────
  {
    numeral: "০২",
    railTop: "টাকা → পণ্য",
    railBottom: "মাল বুঝে নেওয়া",
    heading: "মাল বুঝে নিন ও আসল খরচ ঠিক করুন",
    lede:
      "লাভের হিসাবের জন্য এটিই সবচেয়ে গুরুত্বপূর্ণ ধাপ, কারণ এখানেই ঠিক হয় প্রতিটি পণ্যের আসল খরচ কত। সাপ্লায়ারের দাম-ই শেষ কথা নয় — মাল আনার ভাড়া আর কাস্টমসও পণ্যের খরচের অংশ।",
    steps: [
      {
        title: "যে PO-এর মাল এসেছে সেটি খুলুন",
        detail: "তালিকা থেকে PO নম্বরে ক্লিক করুন।",
        links: [{ href: "/admin/inventory/purchase-orders", label: "ক্রয় আদেশ তালিকা" }],
      },
      {
        title: "“Receive delivery” অংশে সংখ্যা লিখুন",
        detail: "এইবার যত পিস এসেছে শুধু তত লিখুন — মোট সংখ্যা নয়।",
        action: "Record delivery",
      },
      {
        title: "কম মাল এলে সমস্যা নেই",
        detail:
          "১০০ পিসের জায়গায় ৬০ পিস এলে ৬০ লিখুন। বাকি ৪০ পিস Incoming থেকে যাবে, PO খোলা থাকবে। পরে বাকিটা এলে আবার এভাবেই যোগ করুন।",
      },
    ],
    formula: [
      {
        label: "আসল খরচ (Landed cost)",
        body: "সাপ্লায়ারের দাম + ওই পণ্যের ভাগের ভাড়া ও কাস্টমস",
      },
      {
        label: "ভাগ হয়",
        body: "মূল্য অনুপাতে — ৳২,০০০ দামের পণ্য ৳২০০ দামের পণ্যের চেয়ে বেশি ভাড়া বহন করে",
      },
    ],
    tables: [
      {
        caption: "PO-0042 এর পুরো মাল এল · ৳১,০৯,০০০ পণ্যের ওপর ৳৬,০০০ ভাড়া ভাগ হলো",
        head: ["পণ্য", "সাপ্লায়ার দাম", "+ ভাড়ার ভাগ", "আসল খরচ"],
        align: ["left", "right", "right", "right"],
        rows: [
          [
            { text: "কটন পাঞ্জাবি — নেভি / L" },
            { text: "৳৮২০" },
            { text: "৳৪৫" },
            { text: "৳৮৬৫", bold: true },
          ],
          [
            { text: "কটন পাঞ্জাবি — নেভি / M" },
            { text: "৳৮২০" },
            { text: "৳৪৫" },
            { text: "৳৮৬৫", bold: true },
          ],
          [
            { text: "লিনেন শার্ট — সাদা / M" },
            { text: "৳৫৪০" },
            { text: "৳৩০" },
            { text: "৳৫৭০", bold: true },
          ],
        ],
      },
    ],
    doPanel: {
      you: ["এই চালানে কত পিস এসেছে শুধু তা লেখা।", "কম এলে যতটুকু এসেছে ততটুকু নেওয়া।"],
      panel: [
        "স্টক বাড়াবে ও লেজারে PURCHASE এন্ট্রি লিখবে, সাথে PO নম্বর।",
        "পণ্যের ক্রয়মূল্য নতুন আসল খরচে বদলে দেবে — ভবিষ্যতের লাভ এখান থেকেই হিসাব হবে।",
        "সব লাইন পূর্ণ হলে PO নিজে থেকেই RECEIVED হয়ে যাবে।",
        "যারা “স্টকে এলে জানাবেন” দিয়ে রেখেছিল তাদের মেইল যাবে।",
      ],
    },
    callout:
      "কেন এটা জরুরি। ওই পাঞ্জাবি ৳১,২০০ টাকায় বিক্রি করলে আপনার লাভ ৳৩৩৫, ৳৩৮০ নয়। ভাড়া বাদ দিলে প্রতিটি পিসেই লাভ বেশি দেখাবে — আর যত বেশি বিক্রি, ভুল তত বড় হবে।",
  },

  // ── ধাপ ৩ ─────────────────────────────────────────────
  {
    numeral: "০৩",
    railTop: "পণ্য গুদামে",
    railBottom: "স্টক",
    heading: "স্টক দেখাশোনা করুন",
    lede:
      "স্টক মানে অন্য চেহারায় থাকা টাকা। স্টক পাতাটি দুটি প্রশ্নের উত্তর দেয় — কত টাকা গুদামে আটকে আছে, আর কোনটা শেষ হয়ে যাচ্ছে বা কোনটা কোনোদিন বিক্রি হবে না।",
    links: [
      { href: "/admin/inventory", label: "স্টক তালিকা" },
      { href: "/admin/inventory/movements", label: "স্টক লেজার" },
    ],
    tables: [
      {
        caption: "স্টকের অবস্থা — সাইজ থাকলে হিসাব প্রতিটি সাইজে আলাদা হয়",
        head: ["অবস্থা", "মানে", "হিসাবে"],
        rows: [
          [
            { text: "On hand", mono: true },
            { text: "গুদামে বাস্তবে যত আছে।" },
            { text: "আপনার পুঁজি, আসল খরচে হিসাব" },
          ],
          [
            { text: "Reserved", mono: true },
            { text: "অর্ডার হয়েছে কিন্তু এখনো পাঠানো হয়নি।" },
            { text: "পাঠানোর আগ পর্যন্ত আপনারই" },
          ],
          [
            { text: "Available", mono: true },
            { text: "On hand − Reserved। ওয়েবসাইটে যতটুকু বিক্রি হতে পারে।" },
            { text: "ক্রেতা শুধু এই সংখ্যাটাই দেখে" },
          ],
          [
            { text: "Incoming", mono: true },
            { text: "সাপ্লায়ারকে অর্ডার দেওয়া, এখনো আসেনি।" },
            { text: "বিক্রি হবে না, তবে মিথ্যা সতর্কতা বন্ধ রাখে" },
          ],
        ],
      },
      {
        caption: "প্যানেল যেভাবে প্রতিটি পণ্যকে চিহ্নিত করে",
        head: ["চিহ্ন", "কখন", "আপনার করণীয়"],
        rows: [
          [
            { text: "Out", chip: "bad" },
            {
              text: "Available শূন্য। পথে মাল থাকলেও এটা যাবে না — লরির মাল আজ বিক্রি করা যায় না।",
            },
            { text: "এখনই বিক্রি হারাচ্ছেন" },
          ],
          [
            { text: "Reorder", chip: "warn" },
            { text: "Available কমে রি-অর্ডার সীমায় নেমেছে, আর কোনো PO দেওয়া নেই।" },
            { text: "নতুন PO দিন" },
          ],
          [
            { text: "Dead", chip: "mute" },
            { text: "গুদামে মাল আছে, কিন্তু ৯০ দিনে একটাও বিক্রি হয়নি।" },
            { text: "আটকে থাকা টাকা — ছাড় দিয়ে ছাড়ান" },
          ],
          [
            { text: "OK", chip: "ok" },
            { text: "আপাতত যথেষ্ট আছে।" },
            { text: "কিছু করতে হবে না" },
          ],
        ],
      },
    ],
    formula: [
      { label: "দৈনিক বিক্রি", body: "গত ৩০ দিনে বিক্রি ÷ ৩০" },
      {
        label: "রি-অর্ডার সীমা",
        body: "(দৈনিক বিক্রি × লিড টাইম) + (দৈনিক বিক্রি × ৫ দিন বাড়তি)",
      },
      { label: "স্টকের মূল্য", body: "On hand × আসল খরচ" },
    ],
    notes: [
      "স্টকের প্রতিটি পরিবর্তন — বিক্রি, ফেরত, নতুন মাল, ভাঙচুর, গণনার সংশোধন — লেজারে একটি করে এন্ট্রি লেখে: আগে কত ছিল, পরে কত হলো, আর কে করল। কোনো এন্ট্রি কখনো মোছা বা বদলানো যায় না। স্টক সংখ্যার সাথে লেজারের গরমিল হলে লেজারই ঠিক।",
    ],
    callout:
      "ভাঙচুর (Damage) আর সংশোধন (Adjustment) এক জিনিস নয়। ভাঙচুর মানে সত্যিকারের টাকা নষ্ট, আর তার হিসাব হয় ওই পণ্যের আসল খরচ দিয়ে। সংশোধন মানে শুধু গণনার ভুল ঠিক করা, এতে কোনো টাকা যায় না। একটার জায়গায় আরেকটা লিখলে আপনার লাভের হিসাব চুপচাপ ভুল হয়ে যাবে।",
  },

  // ── ধাপ ৪ ─────────────────────────────────────────────
  {
    numeral: "০৪",
    railTop: "পণ্য → টাকা",
    railBottom: "বিক্রয়",
    heading: "বিক্রি ও ডেলিভারি",
    lede:
      "অর্ডার হলেই বিক্রি শেষ নয়। ক্যাশ অন ডেলিভারিতে টাকা আসে তখনই, যখন কুরিয়ার ক্রেতার হাতে মাল দেয়। তাই প্যানেল স্টক ও লাভের হিসাব ডেলিভারির মুহূর্তের সাথে বেঁধে রাখে, অর্ডারের ক্লিকের সাথে নয়।",
    links: [
      { href: "/admin/orders", label: "অর্ডার তালিকা" },
      { href: "/admin/returns", label: "ফেরত অনুরোধ" },
    ],
    tables: [
      {
        caption: "অর্ডারের ধাপ — কোন ধাপে স্টক ও টাকার কী হয়",
        head: ["অবস্থা", "স্টকে প্রভাব", "হিসাবে প্রভাব"],
        rows: [
          [
            { text: "PENDING", mono: true },
            { text: "মাল Reserved হলো। On hand অপরিবর্তিত।" },
            { text: "কিছুই ধরা হয় না" },
          ],
          [
            { text: "CONFIRMED", mono: true },
            { text: "এখনো Reserved (ফোনে নিশ্চিত করা হয়েছে)।" },
            { text: "কিছুই ধরা হয় না" },
          ],
          [
            { text: "SHIPPED", mono: true },
            { text: "Reserved −, On hand −। লেজারে SALE লেখা হয়।" },
            { text: "কিছুই ধরা হয় না" },
          ],
          [
            { text: "DELIVERED", mono: true, tone: "in" },
            { text: "মাল চিরতরে গেল।" },
            { text: "আয় ও পণ্যের খরচ (COGS) এখানে ধরা হয়", bold: true },
          ],
          [
            { text: "CANCELLED", mono: true },
            { text: "Reserved ছেড়ে দেয়, পাঠানো হয়ে থাকলে স্টকে ফেরত।" },
            { text: "কিছুই ধরা হয় না" },
          ],
          [
            { text: "RETURNED", mono: true, tone: "out" },
            { text: "বিক্রয়যোগ্য হলে স্টকে ফেরত, নাহলে ক্ষতি হিসেবে বাদ।" },
            { text: "আয় ফেরত যায়", bold: true },
          ],
        ],
      },
    ],
    callout:
      "খরচ অর্ডারের সময়েই আটকে যায়। অর্ডার হওয়ার মুহূর্তে প্রতিটি লাইনে পণ্যের তখনকার আসল খরচ কপি হয়ে বসে যায়। পরের মাসে সাপ্লায়ার দাম বাড়ালেও গত মাসের লাভ বদলাবে না। এটা না থাকলে একবার দাম বদলালেই আপনার পুরো পুরোনো হিসাব ঘুরে যেত।",
    doPanel: {
      you: [
        "ফোনে অর্ডার নিশ্চিত করে কুরিয়ারে পাঠানো।",
        "কুরিয়ার নিশ্চিত করলে Delivered চিহ্ন দেওয়া।",
        "ফেরত এলে বলা — Resellable (আবার বিক্রি হবে) না Damaged (নষ্ট)।",
      ],
      panel: [
        "একই শেষ পিসের জন্য দুজন ক্রেতা এলে একজনকেই দেবে — ওভারসেল হবে না।",
        "প্রতিটি অবস্থা বদলের সময় লিখে রাখবে — লাভ-লোকসানের হিসাব এই তালিকা থেকেই হয়।",
        "বিক্রি যে মাসে ডেলিভারি হয়েছে সেই মাসে ধরবে, অর্ডারের মাসে নয়।",
        "নষ্ট ফেরত পণ্য স্টকে না ফিরিয়ে ক্ষতির খাতায় তুলবে।",
      ],
    },
  },

  // ── ধাপ ৫ ─────────────────────────────────────────────
  {
    numeral: "০৫",
    railTop: "ফলাফল",
    railBottom: "লাভ-লোকসান",
    heading: "লাভ না লোকসান হিসাব করুন",
    lede:
      "প্রতি মাসের একটি হিসাব, তৈরি হয় অর্ডারের ইতিহাস থেকে। জুলাইয়ে অর্ডার হয়ে আগস্টে ডেলিভারি হলে সেটা আগস্টের আয় — ক্যাশ অন ডেলিভারিতে এটাই একমাত্র সৎ হিসাব।",
    links: [
      { href: "/admin/reports/finance", label: "লাভ-লোকসান রিপোর্ট" },
      { href: "/admin/reports/finance/expenses", label: "খরচ তালিকা" },
      { href: "/admin/reports/finance/expenses/new", label: "নতুন খরচ" },
      { href: "/admin/reports/finance/ad-spend", label: "বিজ্ঞাপন খরচ" },
      { href: "/admin/reports/finance/ad-spend/new", label: "নতুন বিজ্ঞাপন খরচ" },
    ],
    formula: [
      { label: "নিট আয়", body: "মোট বিক্রি − কুপন ছাড় − ফেরত" },
      { label: "মোট লাভ", body: "নিট আয় − পণ্যের খরচ (COGS)" },
      { label: "নিট লাভ", body: "মোট লাভ − পরিচালন খরচ" },
    ],
    doPanel: {
      you: [
        "খরচ — দোকান ভাড়া, বেতন, প্যাকেজিং, সফটওয়্যার, বিদ্যুৎ। ফর্মে Category, Description, Amount (৳), Date incurred দিয়ে Save expense।",
        "বিজ্ঞাপন খরচ — Channel, Amount (৳), Date spent দিয়ে Save ad spend।",
        "এগুলো না লিখলে প্যানেল এমন লাভ দেখাবে যা আপনি আসলে করেননি।",
      ],
      panel: [
        "মোট বিক্রি — এই মাসে ডেলিভারি হওয়া অর্ডারের মূল্য।",
        "COGS — বিক্রি হওয়া ও ফেরত না আসা পণ্যের আটকে রাখা খরচ।",
        "কুরিয়ার, গেটওয়ে ফি, নষ্ট পণ্যের ক্ষতি — অর্ডার থেকেই।",
      ],
    },
    callout:
      "দুটি নিয়ম যা হিসাবকে সৎ রাখে। ক্রেতার দেওয়া ডেলিভারি চার্জ বিক্রির মধ্যে ধরা হয় না — ওটা শুধু কুরিয়ারকে দেওয়ার টাকা, ওটা ধরলে আয় বেশি দেখাবে। আর এই মাসে ডেলিভারি হয়ে পরে ফেরত আসা অর্ডারের বিক্রি ধরা হয়, কিন্তু COGS ধরা হয় না — কারণ পণ্যটা আপনার কাছেই ফিরে এসেছে; নষ্ট হয়ে ফিরলে সেই খরচ ক্ষতির খাতায় যায়।",
  },
];

// The example P&L. `kind` drives the row styling, mirroring the real report at
// /admin/reports/finance so the guide and the page teach the same shape.
export type PlKind = "add" | "sub" | "subtotal" | "section" | "final";

export const PL_ROWS: { label: string; value: string; kind: PlKind }[] = [
  { label: "মোট বিক্রি (ডেলিভারি হওয়া পণ্যের মূল্য)", value: "৳৪,৮৬,৩০০", kind: "add" },
  { label: "কুপন ছাড়", value: "− ৳১৮,৪০০", kind: "sub" },
  { label: "ফেরত", value: "− ৳২১,৯০০", kind: "sub" },
  { label: "নিট আয়", value: "৳৪,৪৬,০০০", kind: "subtotal" },
  { label: "পণ্যের খরচ (COGS)", value: "− ৳২,৮১,০০০", kind: "sub" },
  { label: "মোট লাভ", value: "৳১,৬৫,০০০", kind: "subtotal" },
  { label: "পরিচালন খরচ", value: "", kind: "section" },
  { label: "কুরিয়ার খরচ", value: "− ৳২৬,৭৫০", kind: "sub" },
  { label: "ফেরত আনার খরচ", value: "− ৳১,৩৫০", kind: "sub" },
  { label: "COD / গেটওয়ে ফি", value: "− ৳৪,৮৬০", kind: "sub" },
  { label: "নষ্ট পণ্যের ক্ষতি", value: "− ৳৩,৪৬০", kind: "sub" },
  { label: "বিজ্ঞাপন", value: "− ৳৬২,০০০", kind: "sub" },
  { label: "প্যাকেজিং", value: "− ৳৭,২০০", kind: "sub" },
  { label: "বেতন", value: "− ৳২৪,০০০", kind: "sub" },
  { label: "মোট পরিচালন খরচ", value: "৳১,২৯,৬২০", kind: "subtotal" },
  { label: "নিট লাভ", value: "৳৩৫,৩৮০", kind: "final" },
];

export const LEDGER_ROWS: { type: string; sign: string; tone: "in" | "out" | "muted"; when: string }[] =
  [
    { type: "PURCHASE", sign: "+", tone: "in", when: "PO-এর মাল বুঝে নেওয়া হলো" },
    { type: "SALE", sign: "−", tone: "out", when: "অর্ডার পাঠানো (Shipped) হলো — অর্ডারের সময় নয়" },
    { type: "CANCEL_RESTOCK", sign: "+", tone: "in", when: "অর্ডার বাতিল হয়ে মাল ফেরত এল" },
    { type: "RETURN", sign: "+", tone: "in", when: "ডেলিভারি হওয়া মাল অক্ষত অবস্থায় ফেরত এল" },
    { type: "DAMAGE", sign: "−", tone: "out", when: "ভেঙে গেল, বা ফেরত আসা মাল বিক্রির অযোগ্য" },
    { type: "ADJUSTMENT", sign: "±", tone: "muted", when: "গণনায় ভুল ছিল, সংশোধন করা হলো" },
  ];

/** Every route the guide references, for the closing quick-reference table. */
export const ROUTE_INDEX: { label: string; href: string }[] = [
  { label: "সাপ্লায়ার তালিকা", href: "/admin/inventory/suppliers" },
  { label: "নতুন সাপ্লায়ার", href: "/admin/inventory/suppliers/new" },
  { label: "ক্রয় আদেশ তালিকা", href: "/admin/inventory/purchase-orders" },
  { label: "নতুন ক্রয় আদেশ", href: "/admin/inventory/purchase-orders/new" },
  { label: "স্টক তালিকা", href: "/admin/inventory" },
  { label: "স্টক লেজার", href: "/admin/inventory/movements" },
  { label: "পণ্য তালিকা (স্টক সংশোধন)", href: "/admin/products" },
  { label: "অর্ডার তালিকা", href: "/admin/orders" },
  { label: "ফেরত অনুরোধ", href: "/admin/returns" },
  { label: "লাভ-লোকসান রিপোর্ট", href: "/admin/reports/finance" },
  { label: "খরচ তালিকা", href: "/admin/reports/finance/expenses" },
  { label: "নতুন খরচ", href: "/admin/reports/finance/expenses/new" },
  { label: "বিজ্ঞাপন খরচ", href: "/admin/reports/finance/ad-spend" },
  { label: "নতুন বিজ্ঞাপন খরচ", href: "/admin/reports/finance/ad-spend/new" },
  { label: "ড্যাশবোর্ড", href: "/admin/dashboard" },
];

export const HABITS: { title: string; body: string }[] = [
  {
    title: "প্রতিটি চালান রিসিভ করুন",
    body: "রিসিভ না করে ঢোকা মালের কোনো খরচ থাকে না, তাই তার প্রতিটি বিক্রি পুরোটাই লাভ দেখায়।",
  },
  {
    title: "PO-তে ভাড়া লিখুন",
    body: "সাপ্লায়ারের বলা দাম আর পণ্যের আসল খরচের পার্থক্য এখানেই।",
  },
  {
    title: "সময়মতো Delivered দিন",
    body: "আয় ধরা হয় ডেলিভারিতে। দেরিতে চিহ্ন দিলে বিক্রি ভুল মাসে চলে যায়।",
  },
  {
    title: "প্রতি মাসে খরচ লিখুন",
    body: "ভাড়া, বেতন আর বিজ্ঞাপন নিজে থেকে প্যানেলে আসে না। না লেখা খরচ লাভ হিসেবে দেখায়।",
  },
];
