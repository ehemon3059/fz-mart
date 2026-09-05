// Content for the Bangla operating guide (/admin/guide).
//
// Kept as data rather than inline JSX so the page component stays a thin
// renderer: adding a stage, a step or a link is a data edit, and the stages
// can't drift apart in markup. Every `href` here is a real admin route — they
// are rendered as internal <Link>s, so a typo is a broken link inside the
// panel, not a 404 on a marketing site.
//
// The guide follows ONE product from the supplier's phone call to the month-end
// P&L, in the order a new admin actually meets the screens. Stage 04 (turning a
// draft into a sellable product) exists because the purchase-order screen can
// now create products itself — an admin who does not know that ends up holding
// stock against a product that never reaches the storefront.

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
  /** Overrides the default column headings above `doPanel`. */
  doPanelLabels?: { you: string; panel: string };
  formula?: { label: string; body: string }[];
  tables?: GuideTable[];
  /** Free paragraphs rendered after the tables. */
  notes?: string[];
  callout?: string;
  links?: { href: string; label: string }[];
  /** Stage-specific blocks the renderer owns, flagged rather than hard-coded. */
  showLedger?: boolean;
  showPl?: boolean;
}

export const MASTHEAD = {
  eyebrow: "FZ-Mart · কর্মপদ্ধতি",
  title: "সাপ্লায়ার থেকে লাভ পর্যন্ত",
  lede:
    "নতুন অ্যাডমিনের জন্য পূর্ণ নির্দেশিকা। পণ্য কেনা, গুদামে তোলা, ওয়েবসাইটে বিক্রির উপযোগী করা, বিক্রি করা এবং মাস শেষে লাভ-লোকসান বের করা — পুরো কাজটা ৭টি ধাপে সাজানো। প্রতিটি ধাপে প্যানেলের সংশ্লিষ্ট পাতার লিংক দেওয়া আছে, কাজ করতে করতেই পড়া যাবে।",
  note: "ফর্মের ফিল্ড ও বাটনের নাম ইংরেজিতেই রাখা হয়েছে, ঠিক যেভাবে সেগুলো পর্দায় দেখা যায়।",
};

/** The left sidebar, in the order it appears — a new admin's map of the panel. */
export const NAV_MAP: { heading: string; body: string }[] = [
  {
    heading: "Catalog",
    body: "Products, Categories, Size Guides, Banners — ক্রেতা যা দেখে তার সব কিছু এখানে তৈরি হয়।",
  },
  {
    heading: "Inventory",
    body: "Stock Overview, Stock Movements, Purchase Orders, Suppliers, Stock-takes, Locations — কেনা ও গুদামের সব কাজ।",
  },
  {
    heading: "Sales",
    body: "Orders, Cancelled Orders, Returns, Coupons, Flash Sales, Reviews — বিক্রি ও ডেলিভারির সব কাজ।",
  },
  {
    heading: "Reports",
    body: "Profit & Loss, Cash Flow, Profit by Supplier, Order Reports, Delivery — টাকার হিসাব এখানে।",
  },
];

export const LOOP_NODES = [
  { k: "CASH", t: "ক্রয় আদেশ", s: "সাপ্লায়ারকে টাকা দিলেন" },
  { k: "GOODS", t: "স্টকে পণ্য", s: "পুঁজি এখন গুদামে" },
  { k: "LISTED", t: "বিক্রির জন্য প্রস্তুত", s: "ছবি ও দাম বসল, পণ্য লাইভ" },
  { k: "RESERVED", t: "অর্ডার হয়েছে", s: "বিক্রি, কিন্তু পাঠানো হয়নি" },
  { k: "DELIVERED", t: "ডেলিভারি সম্পন্ন", s: "ক্যাশ অন ডেলিভারিতে টাকা এল" },
  { k: "PROFIT", t: "নিট লাভ", s: "যা আসলে থেকে গেল" },
];

export const STAGES: GuideStage[] = [
  // ── ধাপ ১ ─────────────────────────────────────────────
  {
    numeral: "০১",
    railTop: "শুরু",
    railBottom: "সাপ্লায়ার",
    heading: "সাপ্লায়ার যোগ করুন",
    lede:
      "যার কাছ থেকে মাল কেনেন তিনিই সাপ্লায়ার। প্যানেলে সাপ্লায়ার আগে তৈরি না করলে ক্রয় আদেশ লেখাই যায় না — তাই এটিই প্রথম কাজ। একবার যোগ করলে সারাজীবন কাজে লাগবে।",
    links: [
      { href: "/admin/inventory/suppliers", label: "সাপ্লায়ার তালিকা" },
      { href: "/admin/inventory/suppliers/new", label: "নতুন সাপ্লায়ার" },
    ],
    steps: [
      {
        title: "বাঁ পাশের মেনু থেকে Inventory › Suppliers-এ যান",
        detail:
          "তালিকায় প্রতিটি সাপ্লায়ারের নাম, ফোন, লিড টাইম আর সে সক্রিয় কি না দেখা যাবে।",
        links: [{ href: "/admin/inventory/suppliers", label: "সাপ্লায়ার তালিকা" }],
      },
      {
        title: "New supplier চেপে ফর্ম পূরণ করুন",
        detail:
          "নাম ছাড়া বাকি সব ঐচ্ছিক, কিন্তু ফোন আর লিড টাইম না দিলে পরে নিজেকেই খুঁজতে হবে।",
        fields: ["Name", "Phone", "Email", "Address", "Lead time (days)", "Status", "Note"],
        action: "Save supplier",
        links: [{ href: "/admin/inventory/suppliers/new", label: "নতুন সাপ্লায়ার" }],
      },
      {
        title: "Lead time (days) অবশ্যই দিন",
        detail:
          "অর্ডার দেওয়ার পর মাল আসতে গড়ে কত দিন লাগে — শুধু সেই সংখ্যাটি। এটি দিয়েই প্যানেল হিসাব করে কোন পণ্যে কখন আবার অর্ডার দিতে হবে। খালি রাখলে ডিফল্ট ৭ দিন ধরা হয়, আর সাপ্লায়ার ধীর হলে সেই হিসাব আপনাকে ঠকাবে।",
      },
      {
        title: "সম্পর্ক শেষ হলে মুছবেন না — Status বদলে Inactive করুন",
        detail:
          "যার নামে একটিও ক্রয় আদেশ আছে তাকে প্যানেল মুছতে দেবে না, কারণ পুরোনো কাগজপত্র তখন মালিকহীন হয়ে যেত। Inactive করলে নতুন অর্ডারের তালিকায় সে আর আসবে না, কিন্তু পুরোনো হিসাব অক্ষত থাকবে।",
      },
    ],
    doPanel: {
      you: [
        "সাপ্লায়ারের নাম, ফোন ও ঠিকানা লেখা।",
        "লিড টাইম — বাস্তবে কত দিন লাগে, তা-ই লেখা।",
        "পুরোনো সাপ্লায়ারকে Inactive করা, মুছে না ফেলা।",
      ],
      panel: [
        "ক্রয় আদেশের ফর্মে এই সাপ্লায়ারকে বাছাইযোগ্য করে দেবে।",
        "লিড টাইম দিয়ে প্রতিটি পণ্যের রি-অর্ডার সীমা হিসাব করবে।",
        "যার অর্ডার আছে তাকে মুছতে দেবে না — Inactive করার পরামর্শ দেবে।",
      ],
    },
  },

  // ── ধাপ ২ ─────────────────────────────────────────────
  {
    numeral: "০২",
    railTop: "টাকা বেরোয়",
    railBottom: "ক্রয় আদেশ",
    heading: "ক্রয় আদেশ (Purchase Order) তৈরি করুন",
    lede:
      "আপনার প্রতিটি পণ্য একটি ক্রয় আদেশ দিয়ে দোকানে ঢোকে। PO-তে থাকে কোন সাপ্লায়ার, কী কী পণ্য, কত দরে, আর মাল আনতে কত ভাড়া ও কাস্টমস লেগেছে। এই কাগজটাই পরে বলে দেবে পণ্যের আসল খরচ কত।",
    links: [
      { href: "/admin/inventory/purchase-orders", label: "ক্রয় আদেশ তালিকা" },
      { href: "/admin/inventory/purchase-orders/new", label: "নতুন ক্রয় আদেশ" },
    ],
    steps: [
      {
        title: "Inventory › Purchase Orders › New purchase order",
        detail: "উপরে সাপ্লায়ার ও কবে মাল আসার কথা সেই তারিখ দিন।",
        fields: ["Supplier", "Expected on", "Note"],
        links: [{ href: "/admin/inventory/purchase-orders/new", label: "নতুন ক্রয় আদেশ" }],
      },
      {
        title: "প্রতিটি লাইনে পণ্য, অপশন, পরিমাণ ও ক্রয়মূল্য বসান",
        detail:
          "একই PO-তে যত খুশি লাইন দিতে পারেন। সাইজ বা রঙ থাকলে Option-এ ঠিক কোনটি কিনছেন তা বাছুন — স্টকের হিসাব সাইজ ধরে ধরেই হয়।",
        fields: ["Product", "Option", "Quantity", "Unit cost ৳"],
      },
      {
        title: "পণ্যটি এখনো প্যানেলে নেই? এখান থেকেই তৈরি করে নিন",
        detail:
          "লাইনের পণ্য বাছাইয়ের পাশে New product প্যানেল আছে। শুধু নাম, ক্যাটাগরি, আর কমা দিয়ে রঙ ও সাইজ লিখে দিলেই হবে — দাম বা ছবি এখন লাগবে না। সাপ্লায়ার ফোনে থাকা অবস্থায় এটাই দ্রুততম পথ। পণ্যটি Draft হিসেবে তৈরি হবে; ধাপ ০৪-এ সেটিকে বিক্রির উপযোগী করতে হবে।",
        fields: ["Product name", "Category", "Colors", "Sizes"],
        action: "Create product",
      },
      {
        title: "নিচে পুরো চালানের ভাড়া ও কাস্টমস খরচ লিখুন",
        detail:
          "এটি পুরো চালানের খরচ, প্রতি পণ্যের নয়। প্যানেল নিজেই এটিকে পণ্যগুলোর মধ্যে ভাগ করে দেবে।",
        fields: ["Freight ৳", "Customs / clearing ৳"],
        action: "Create draft",
      },
      {
        title: "সাপ্লায়ারকে সত্যিই অর্ডার দেওয়ার পর Place order চাপুন",
        detail:
          "তখন থেকে ওই পণ্যগুলো Incoming (পথে আছে) হিসেবে গণনা হবে। খেয়াল রাখুন — Place order চাপার পর আর Edit করা যায় না; ভুল হলে Cancel order দিয়ে বাতিল করে নতুন PO লিখতে হবে।",
      },
      {
        title: "সাপ্লায়ারকে টাকা দিলে PO পাতায় Supplier payments-এ লিখে রাখুন",
        detail:
          "কত দিলেন, কবে দিলেন, কীভাবে দিলেন (bKash, cash, bank)। এতে কোন সাপ্লায়ারের কত বাকি আছে তা এক নজরে দেখা যায়, আর Cash Flow রিপোর্টে টাকাটা ঠিক জায়গায় বসে।",
        fields: ["Amount ৳", "Paid on", "How", "Note"],
      },
    ],
    doPanel: {
      you: [
        "সাপ্লায়ার, তারিখ, পণ্য, পরিমাণ ও দর লেখা।",
        "চালানের ভাড়া ও কাস্টমস খরচ লেখা।",
        "সাপ্লায়ারকে অর্ডার দেওয়ার পর Place order চাপা।",
        "টাকা দিলে Supplier payments-এ লিখে রাখা।",
      ],
      panel: [
        "PO-0042 এর মতো একটি নম্বর দেবে।",
        "না-আসা পণ্য Incoming দেখাবে — দেখা যাবে, কিন্তু বিক্রি হবে না।",
        "যে পণ্য ইতিমধ্যে অর্ডার করা, তার জন্য বারবার রি-অর্ডার সতর্কবার্তা দেবে না।",
        "পণ্যের নাম PO-তে সংরক্ষণ করে রাখবে — পরে নাম বদলালেও পুরোনো কাগজ বদলাবে না।",
        "বকেয়ার চেয়ে বেশি টাকা লিখতে দেবে না।",
      ],
    },
    tables: [
      {
        caption: "ক্রয় আদেশের চারটি অবস্থা · কোনটায় কী করা যায়",
        head: ["অবস্থা", "মানে", "কী করা যায়"],
        rows: [
          [
            { text: "DRAFT", mono: true },
            { text: "লেখা হয়েছে, সাপ্লায়ারকে এখনো বলা হয়নি।" },
            { text: "Edit · Delete · Place order" },
          ],
          [
            { text: "ORDERED", mono: true },
            { text: "সাপ্লায়ারকে বলা হয়েছে, মাল পথে।" },
            { text: "Receive delivery · Cancel order" },
          ],
          [
            { text: "RECEIVED", mono: true, tone: "in" },
            { text: "সব লাইনের মাল বুঝে নেওয়া শেষ।" },
            { text: "শুধু দেখা যায় — টাকার হিসাব লেখা ছাড়া" },
          ],
          [
            { text: "CANCELLED", mono: true, tone: "out" },
            { text: "বাতিল। Incoming থেকে বাদ।" },
            { text: "একটুও মাল না এসে থাকলে মোছা যায়" },
          ],
        ],
      },
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
    callout:
      "PO না লিখে সরাসরি স্টক বাড়াবেন না। হাতে স্টক বাড়ালে পণ্যের কোনো খরচ প্যানেলের জানা থাকে না, আর তখন ওই পণ্যের প্রতিটি বিক্রি পুরোটাই লাভ দেখায়। মাস শেষে এটাই সবচেয়ে বড় ভুল হিসাব।",
  },

  // ── ধাপ ৩ ─────────────────────────────────────────────
  {
    numeral: "০৩",
    railTop: "টাকা → পণ্য",
    railBottom: "মাল বুঝে নেওয়া",
    heading: "মাল বুঝে নিন ও আসল খরচ ঠিক করুন",
    lede:
      "লাভের হিসাবের জন্য এটিই সবচেয়ে গুরুত্বপূর্ণ ধাপ, কারণ এখানেই ঠিক হয় প্রতিটি পণ্যের আসল খরচ কত। সাপ্লায়ারের দাম-ই শেষ কথা নয় — মাল আনার ভাড়া আর কাস্টমসও পণ্যের খরচের অংশ।",
    links: [{ href: "/admin/inventory/purchase-orders", label: "ক্রয় আদেশ তালিকা" }],
    steps: [
      {
        title: "যে PO-এর মাল এসেছে সেটি খুলুন",
        detail:
          "তালিকা থেকে PO নম্বরে ক্লিক করুন। অবস্থা ORDERED থাকলেই কেবল মাল বুঝে নেওয়া যাবে।",
        links: [{ href: "/admin/inventory/purchase-orders", label: "ক্রয় আদেশ তালিকা" }],
      },
      {
        title: "মাল কোথায় নামল তা বাছুন",
        detail:
          "একাধিক গুদাম বা শোরুম থাকলে Location বাছুন। একটাই জায়গা হলে এটা নিয়ে ভাবার দরকার নেই।",
        fields: ["Location"],
      },
      {
        title: "“Receive delivery” অংশে প্রতিটি লাইনে সংখ্যা লিখুন",
        detail: "এইবার যত পিস এসেছে শুধু তত লিখুন — মোট সংখ্যা নয়।",
        action: "Record delivery",
      },
      {
        title: "কম মাল এলে সমস্যা নেই",
        detail:
          "১০০ পিসের জায়গায় ৬০ পিস এলে ৬০ লিখুন। বাকি ৪০ পিস Incoming থেকে যাবে, PO খোলা থাকবে। পরে বাকিটা এলে আবার এভাবেই যোগ করুন। সব লাইন পূর্ণ হলে PO নিজে থেকেই RECEIVED হয়ে যাবে।",
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
      you: [
        "এই চালানে কত পিস এসেছে শুধু তা লেখা।",
        "কম এলে যতটুকু এসেছে ততটুকু নেওয়া।",
        "মাল কোন গুদামে নামল তা বাছা।",
      ],
      panel: [
        "স্টক বাড়াবে ও লেজারে PURCHASE এন্ট্রি লিখবে, সাথে PO নম্বর।",
        "প্রতি পিসের আসল খরচ হিসাব করে পণ্যের ক্রয়মূল্য নতুন করে বসাবে — ভবিষ্যতের লাভ এখান থেকেই হিসাব হবে।",
        "আংশিক চালানেও প্রতি পিসে ভাড়ার ভাগ একই রাখবে, প্রথম চালানের ঘাড়ে পুরোটা চাপাবে না।",
        "সব লাইন পূর্ণ হলে PO নিজে থেকেই RECEIVED করে দেবে।",
        "যারা “স্টকে এলে জানাবেন” দিয়ে রেখেছিল তাদের মেইল পাঠাবে।",
      ],
    },
    callout:
      "কেন এটা জরুরি। ওই পাঞ্জাবি ৳১,২০০ টাকায় বিক্রি করলে আপনার লাভ ৳৩৩৫, ৳৩৮০ নয়। ভাড়া বাদ দিলে প্রতিটি পিসেই লাভ বেশি দেখাবে — আর যত বেশি বিক্রি, ভুল তত বড় হবে।",
  },

  // ── ধাপ ৪ ─────────────────────────────────────────────
  {
    numeral: "০৪",
    railTop: "পণ্য → দোকান",
    railBottom: "বিক্রির উপযোগী",
    heading: "পণ্যটি বিক্রির উপযোগী করুন",
    lede:
      "গুদামে মাল থাকা আর ওয়েবসাইটে বিক্রি হওয়া এক কথা নয়। ক্রয় আদেশ থেকে তৈরি পণ্য Draft অবস্থায় থাকে — ছবি ও দাম বসিয়ে Active না করা পর্যন্ত ক্রেতা সেটি দেখতেই পাবে না। এই ধাপটা বাদ পড়লে স্টক পড়ে থাকে অথচ একটাও বিক্রি হয় না।",
    links: [
      { href: "/admin/products", label: "পণ্য তালিকা" },
      { href: "/admin/products/new", label: "নতুন পণ্য" },
      { href: "/admin/categories", label: "ক্যাটাগরি" },
    ],
    steps: [
      {
        title: "Catalog › Products-এ গিয়ে Draft পণ্যটি খুলুন",
        detail:
          "একদম নতুন পণ্য হলে New product চাপুন। ফর্মটি ধাপে ধাপে সাজানো — উপর থেকে নিচে পূরণ করলেই হবে।",
        links: [{ href: "/admin/products", label: "পণ্য তালিকা" }],
      },
      {
        title: "1 · What it is — নাম ও ক্যাটাগরি",
        detail:
          "ক্যাটাগরি বাছাই না করা পর্যন্ত ফর্মের বাকি অংশ খুলবে না, কারণ ক্যাটাগরিই ঠিক করে পণ্যটি কীভাবে বিক্রি হবে এবং কোন সাইজ গাইড পাবে।",
        fields: ["Product name", "Category"],
      },
      {
        title: "2 · How is it sold? — এক দাম, না রঙ, না সাইজ",
        detail:
          "তিনটি ধরন: Single (এক দাম, এক স্টক), Colors (প্রতি রঙে আলাদা ছবি-দাম-স্টক), Sizes (রঙ × সাইজ মিলিয়ে ছক)। ক্যাটাগরি থেকে ধরনটি নিজে থেকেই বসে যায়; ব্যতিক্রম হলে হাতে বদলানো যায়।",
      },
      {
        title: "3 · Photos — অন্তত একটি ছবি দিন",
        detail:
          "ছবি ছাড়া পণ্য লাইভ করা যাবে না। রঙভিত্তিক পণ্যে প্রতিটি রঙের নিজস্ব ছবিও দেওয়া যায়; সেটিও ছবি হিসেবেই গোনা হয়।",
      },
      {
        title: "4 · Options & pricing — দাম বসান",
        detail:
          "Price হলো ক্রেতার দেখা দাম। Discount price দিলে কাটা দামসহ দেখাবে। Sourcing cost হলো ক্রয়মূল্য — PO দিয়ে মাল বুঝে নিলে এটি নিজে থেকেই বসে যায়, তাই হাতে বদলানোর দরকার নেই। Low-stock alert at দিলে সেই সংখ্যায় নামলে সতর্কবার্তা পাবেন।",
        fields: ["Price", "Discount price", "Opening stock", "Sourcing cost", "Low-stock alert at"],
      },
      {
        title: "স্টকের ঘর ধূসর দেখাচ্ছে? সেটাই ঠিক",
        detail:
          "যে অপশনের স্টক একবার লেজারে ঢুকে গেছে, সেটি আর এই ফর্ম থেকে টাইপ করা যায় না — শুধু দেখা যায়। স্টক বদলাতে হলে PO রিসিভ করুন, অথবা Inventory → Stock-takes দিয়ে গুনে মিলিয়ে নিন। কারণটা সহজ: এখানে সংখ্যা বদলালে স্টক নড়ত, অথচ কেন নড়ল তার কোনো ব্যাখ্যা থাকত না।",
      },
      {
        title: "ডান পাশে Visibility থেকে Active করুন",
        detail:
          "তিনটি অবস্থা — Draft (এখনো তৈরি হয়নি), Active (ওয়েবসাইটে দেখা যাচ্ছে), Hidden (তৈরি, কিন্তু আপাতত লুকানো)। ছবি ও দাম না থাকলে প্যানেল Active করতে দেবে না, বরং কী কী বাকি আছে বলে দেবে।",
        action: "Save product",
      },
    ],
    tables: [
      {
        caption: "পণ্যের তিনটি অবস্থা",
        head: ["অবস্থা", "ক্রেতা দেখে?", "কখন ব্যবহার করবেন"],
        rows: [
          [
            { text: "DRAFT", mono: true, tone: "muted" },
            { text: "না" },
            { text: "PO থেকে সদ্য তৈরি — ছবি ও দাম এখনো বাকি" },
          ],
          [
            { text: "ACTIVE", mono: true, tone: "in" },
            { text: "হ্যাঁ" },
            { text: "সব প্রস্তুত, বিক্রি চলবে" },
          ],
          [
            { text: "INACTIVE", mono: true, tone: "out" },
            { text: "না" },
            { text: "সিজন শেষ, বা সাময়িকভাবে বন্ধ রাখতে চান" },
          ],
        ],
      },
    ],
    doPanel: {
      you: [
        "নাম, ক্যাটাগরি ও বিক্রির ধরন ঠিক করা।",
        "অন্তত একটি ভালো ছবি দেওয়া।",
        "Price বসানো — এটাই ক্রেতার দেখা দাম।",
        "সব ঠিক থাকলে Visibility → Active করা।",
      ],
      panel: [
        "ছবি বা দাম ছাড়া পণ্য লাইভ হতে দেবে না।",
        "ক্যাটাগরি অনুযায়ী সাইজ গাইড নিজে থেকে জুড়ে দেবে।",
        "লেজারের দখলে থাকা স্টকের ঘর টাইপ করতে দেবে না।",
        "সেভ করলে ওয়েবসাইটের ক্যাটাগরি পাতাগুলো নতুন করে সাজাবে।",
      ],
    },
    callout:
      "PO ছাড়া হাতে পণ্য তৈরি করলে Sourcing cost নিজে লিখে দিন। এটি খালি থাকলে প্যানেল ধরে নেয় পণ্যটির খরচ শূন্য, আর তখন লাভের রিপোর্টে ওই পণ্যের পুরো বিক্রিটাই লাভ হয়ে বসে থাকে।",
  },

  // ── ধাপ ৫ ─────────────────────────────────────────────
  {
    numeral: "০৫",
    railTop: "পণ্য গুদামে",
    railBottom: "স্টক",
    heading: "স্টক ব্যবস্থা যেভাবে কাজ করে",
    lede:
      "স্টক মানে অন্য চেহারায় থাকা টাকা। Stock Overview পাতাটি দুটি প্রশ্নের উত্তর দেয় — কত টাকা গুদামে আটকে আছে, আর কোনটা শেষ হয়ে যাচ্ছে বা কোনটা কোনোদিন বিক্রি হবে না। সাইজওয়ালা পণ্যের হিসাব প্রতিটি সাইজে আলাদা, কারণ মালগুলো ওখানেই থাকে।",
    links: [
      { href: "/admin/inventory", label: "স্টক তালিকা" },
      { href: "/admin/inventory/movements", label: "স্টক লেজার" },
      { href: "/admin/inventory/stock-takes", label: "স্টক গণনা" },
      { href: "/admin/inventory/locations", label: "গুদাম / লোকেশন" },
    ],
    tables: [
      {
        caption: "চারটি সংখ্যা — একই পণ্যের চারটি আলাদা অর্থ",
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
    showLedger: true,
    notes: [
      "স্টকের প্রতিটি পরিবর্তন — বিক্রি, ফেরত, নতুন মাল, ভাঙচুর, গণনার সংশোধন — লেজারে একটি করে এন্ট্রি লেখে: আগে কত ছিল, পরে কত হলো, কোন কাগজের সূত্রে, আর কে করল। কোনো এন্ট্রি কখনো মোছা বা বদলানো যায় না। স্টক সংখ্যার সাথে লেজারের গরমিল হলে লেজারই ঠিক।",
      "বছরে দু-একবার শেলফ গুনে মেলানোর জন্য Stock-takes ব্যবহার করুন। একটি সেশন খুলে বারকোড স্ক্যান করে বা নাম-SKU লিখে গোনা সংখ্যা বসান, পুরো তালিকার গরমিল একসাথে দেখুন, তারপর Apply করুন। গোনার মাঝখানে কোনো অর্ডার চলে গেলে বা নতুন মাল এলে প্যানেল সেটিও হিসাবে নেয় — তাই গণনা আগের কোনো কাজ চুপচাপ মুছে দেয় না।",
      "একাধিক গুদাম বা শোরুম থাকলে Locations-এ সেগুলো যোগ করুন এবং একটিকে ডিফল্ট করুন। লোকেশন হলো মাল কোথায় নামল তার লেবেল — মাল বুঝে নেওয়ার সময় বেছে দিলে পরে কোন গুদামে কী গেছে তা বের করা যায়।",
      "স্টক তালিকার Export বাটন যা দেখছেন তা-ই CSV করে নামিয়ে দেয় — Out বা Reorder ফিল্টার চালু থাকলে শুধু সেটুকুই। গুদামে গিয়ে হাতে মেলানোর জন্য এই তালিকাটাই ছাপিয়ে নিন।",
    ],
    callout:
      "ভাঙচুর (Damage) আর সংশোধন (Adjustment) এক জিনিস নয়। ভাঙচুর মানে সত্যিকারের টাকা নষ্ট, আর তার হিসাব হয় ওই পণ্যের আসল খরচ দিয়ে — মাস শেষে সেটা লোকসানের খাতায় ওঠে। সংশোধন মানে শুধু গণনার ভুল ঠিক করা, এতে কোনো টাকা যায় না। একটার জায়গায় আরেকটা লিখলে আপনার লাভের হিসাব চুপচাপ ভুল হয়ে যাবে।",
  },

  // ── ধাপ ৬ ─────────────────────────────────────────────
  {
    numeral: "০৬",
    railTop: "পণ্য → টাকা",
    railBottom: "বিক্রয়",
    heading: "বিক্রি ও ডেলিভারি",
    lede:
      "অর্ডার হলেই বিক্রি শেষ নয়। ক্যাশ অন ডেলিভারিতে টাকা আসে তখনই, যখন কুরিয়ার ক্রেতার হাতে মাল দেয়। তাই প্যানেল স্টক ও লাভের হিসাব ডেলিভারির মুহূর্তের সাথে বেঁধে রাখে, অর্ডারের ক্লিকের সাথে নয়।",
    links: [
      { href: "/admin/orders", label: "অর্ডার তালিকা" },
      { href: "/admin/returns", label: "ফেরত অনুরোধ" },
      { href: "/admin/reports/delivery", label: "ডেলিভারি রিপোর্ট" },
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

  // ── ধাপ ৭ ─────────────────────────────────────────────
  {
    numeral: "০৭",
    railTop: "ফলাফল",
    railBottom: "লাভ-লোকসান",
    heading: "লাভ না লোকসান — কোথায় দেখবেন",
    lede:
      "প্রতি মাসের একটি হিসাব, তৈরি হয় অর্ডারের ইতিহাস থেকে। জুলাইয়ে অর্ডার হয়ে আগস্টে ডেলিভারি হলে সেটা আগস্টের আয় — ক্যাশ অন ডেলিভারিতে এটাই একমাত্র সৎ হিসাব।",
    links: [
      { href: "/admin/reports/finance", label: "লাভ-লোকসান রিপোর্ট" },
      { href: "/admin/reports/cashflow", label: "ক্যাশ ফ্লো" },
      { href: "/admin/reports/suppliers", label: "সাপ্লায়ারভিত্তিক লাভ" },
      { href: "/admin/reports/finance/expenses/new", label: "নতুন খরচ" },
      { href: "/admin/reports/finance/ad-spend/new", label: "নতুন বিজ্ঞাপন খরচ" },
    ],
    formula: [
      { label: "নিট আয়", body: "মোট বিক্রি − কুপন ছাড় − ফেরত" },
      { label: "মোট লাভ", body: "নিট আয় − পণ্যের খরচ (COGS)" },
      { label: "নিট লাভ", body: "মোট লাভ − পরিচালন খরচ" },
    ],
    showPl: true,
    doPanelLabels: { you: "যা আপনাকে হাতে লিখতে হবে", panel: "যা নিজে থেকেই আসে" },
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
    tables: [
      {
        caption: "তিনটি রিপোর্ট, তিনটি আলাদা প্রশ্ন",
        head: ["রিপোর্ট", "যে প্রশ্নের উত্তর দেয়", "কখন দেখবেন"],
        rows: [
          [
            { text: "Profit & Loss" },
            { text: "এই মাসে ব্যবসা লাভ করল না লোকসান?" },
            { text: "প্রতি মাসের শুরুতে" },
          ],
          [
            { text: "Cash Flow" },
            { text: "হাতে কত টাকা এল আর কত বেরোল?" },
            { text: "লাভ দেখাচ্ছে অথচ হাতে টাকা নেই — তখন" },
          ],
          [
            { text: "Profit by Supplier" },
            { text: "কার মাল আসলে লাভ দেয়?" },
            { text: "নতুন অর্ডার দেওয়ার আগে" },
          ],
        ],
      },
    ],
    notes: [
      "লাভ আর হাতের টাকা এক জিনিস নয়। একই মাসে আপনি ৳৩৫,০০০ লাভ করেও ক্যাশে টান খেতে পারেন, কারণ পুরো টাকাটা নতুন স্টক কিনতে চলে গেছে। Cash Flow পাতাটি এই পার্থক্যটাই দেখায় — কত টাকা COD-তে উঠল, কত সাপ্লায়ারকে গেল, কত কুরিয়ার ও বিজ্ঞাপনে গেল।",
      "Profit by Supplier প্রতিটি পণ্যকে তার সর্বশেষ রিসিভ করা PO-এর সাপ্লায়ারের নামে ধরে। যে পণ্য কখনো PO দিয়ে আসেনি, সেটি “সাপ্লায়ারের সাথে যুক্ত নয়” সারিতে আলাদা করে দেখানো হয় — লুকিয়ে ফেলা হয় না।",
    ],
    callout:
      "দুটি নিয়ম যা হিসাবকে সৎ রাখে। ক্রেতার দেওয়া ডেলিভারি চার্জ বিক্রির মধ্যে ধরা হয় না — ওটা শুধু কুরিয়ারকে দেওয়ার টাকা, ওটা ধরলে আয় বেশি দেখাবে। আর এই মাসে ডেলিভারি হয়ে পরে ফেরত আসা অর্ডারের বিক্রি ধরা হয়, কিন্তু COGS ধরা হয় না — কারণ পণ্যটা আপনার কাছেই ফিরে এসেছে; নষ্ট হয়ে ফিরলে সেই খরচ ক্ষতির খাতায় যায়।",
  },
];

/**
 * "কেনা থেকে বিক্রি" — one product's whole life, and which screen shows each
 * step. This is the question a new admin asks that no single page answers.
 */
export const TRACE_ROWS: { step: string; where: string; href: string; shows: string }[] = [
  {
    step: "কত দরে কিনেছিলাম",
    where: "ক্রয় আদেশ",
    href: "/admin/inventory/purchase-orders",
    shows: "সাপ্লায়ার, তারিখ, প্রতি পিসের দর, ভাড়া ও কাস্টমস",
  },
  {
    step: "আসল খরচ কত দাঁড়াল",
    where: "পণ্যের এডিট পাতা",
    href: "/admin/products",
    shows: "Sourcing cost — ভাড়া ভাগ করার পরের প্রতি পিসের খরচ",
  },
  {
    step: "কবে কত ঢুকল, কবে কত বেরোল",
    where: "স্টক লেজার",
    href: "/admin/inventory/movements",
    shows: "প্রতিটি নড়াচড়া — আগে কত, পরে কত, কোন PO বা কোন অর্ডারে, কে করল",
  },
  {
    step: "এখন কত আছে, কত বিক্রি হচ্ছে",
    where: "স্টক তালিকা",
    href: "/admin/inventory",
    shows: "On hand, Reserved, Available, Incoming, দৈনিক বিক্রি, স্টকের মূল্য",
  },
  {
    step: "কত দামে বিক্রি হলো",
    where: "অর্ডার তালিকা",
    href: "/admin/orders",
    shows: "বিক্রয়মূল্য, ছাড়, ও অর্ডারের সময়ে আটকে যাওয়া ক্রয়মূল্য",
  },
  {
    step: "এতে লাভ কত হলো",
    where: "সাপ্লায়ারভিত্তিক লাভ",
    href: "/admin/reports/suppliers",
    shows: "আয় − COGS = মোট লাভ ও মার্জিন, সাপ্লায়ার ধরে ধরে",
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
    { type: "OPENING", sign: "+", tone: "in", when: "নতুন পণ্যের শুরুর স্টক বসানো হলো" },
  ];

/** Every route the guide references, for the closing quick-reference table. */
export const ROUTE_INDEX: { label: string; href: string }[] = [
  { label: "ছবিতে হিসাব (Easy Inventory)", href: "/admin/guide/easy-inventory" },
  { label: "সাপ্লায়ার তালিকা", href: "/admin/inventory/suppliers" },
  { label: "নতুন সাপ্লায়ার", href: "/admin/inventory/suppliers/new" },
  { label: "ক্রয় আদেশ তালিকা", href: "/admin/inventory/purchase-orders" },
  { label: "নতুন ক্রয় আদেশ", href: "/admin/inventory/purchase-orders/new" },
  { label: "স্টক তালিকা", href: "/admin/inventory" },
  { label: "স্টক লেজার", href: "/admin/inventory/movements" },
  { label: "স্টক গণনা", href: "/admin/inventory/stock-takes" },
  { label: "গুদাম / লোকেশন", href: "/admin/inventory/locations" },
  { label: "পণ্য তালিকা", href: "/admin/products" },
  { label: "নতুন পণ্য", href: "/admin/products/new" },
  { label: "ক্যাটাগরি", href: "/admin/categories" },
  { label: "অর্ডার তালিকা", href: "/admin/orders" },
  { label: "ফেরত অনুরোধ", href: "/admin/returns" },
  { label: "লাভ-লোকসান রিপোর্ট", href: "/admin/reports/finance" },
  { label: "ক্যাশ ফ্লো", href: "/admin/reports/cashflow" },
  { label: "সাপ্লায়ারভিত্তিক লাভ", href: "/admin/reports/suppliers" },
  { label: "ডেলিভারি রিপোর্ট", href: "/admin/reports/delivery" },
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
    title: "Draft পণ্য ফেলে রাখবেন না",
    body: "ছবি ও দাম না বসানো পর্যন্ত পণ্যটি ক্রেতা দেখে না — স্টক পড়ে থাকে, বিক্রি হয় না।",
  },
  {
    title: "সময়মতো Delivered দিন",
    body: "আয় ধরা হয় ডেলিভারিতে। দেরিতে চিহ্ন দিলে বিক্রি ভুল মাসে চলে যায়।",
  },
  {
    title: "প্রতি মাসে খরচ লিখুন",
    body: "ভাড়া, বেতন আর বিজ্ঞাপন নিজে থেকে প্যানেলে আসে না। না লেখা খরচ লাভ হিসেবে দেখায়।",
  },
  {
    title: "Damage আর Adjustment আলাদা রাখুন",
    body: "নষ্ট মাল সত্যিকারের লোকসান, গণনার সংশোধন নয়। গুলিয়ে ফেললে লোকসান অদৃশ্য হয়ে যায়।",
  },
];
