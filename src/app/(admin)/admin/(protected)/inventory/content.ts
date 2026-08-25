// Page-local bilingual copy for the Inventory screens, following the same
// pattern as settings/courier/content.ts: an in-page toggle swaps dictionaries
// without touching the site-wide NEXT_LOCALE cookie.
//
// The Bangla here is written for a shop owner, not translated word-for-word
// from the English. Where a term is genuinely English in Bangladeshi retail
// usage ("stock", "available"), it stays English rather than being forced into
// an unfamiliar Bangla coinage.

export type InvLang = "en" | "bn";

export interface InventoryCopy {
  toggleLabel: string;

  overview: {
    heading: string;
    subtitle: string;
    kpiOut: string;
    kpiOutSub: string;
    kpiReorder: string;
    kpiReorderSub: string;
    kpiDead: string;
    kpiDeadSub: (rows: number, days: number) => string;
    kpiValue: string;
    kpiValueSub: (onHand: string, reserved: string) => string;
    writeOff: (units: number) => string;
    writeOffTail: (days: number, value: string) => string;
    writeOffLink: string;
    unknownCost: string;
    showing: (shown: number, total: number) => string;
    clearFilter: string;
    emptyTitle: string;
    emptyBody: string;
    emptyAction: string;
    noMatch: string;
    digestTitle: string;
    digestSub: string;
    digestSend: string;
    colProduct: string;
    colOnHand: string;
    colReserved: string;
    colAvailable: string;
    colIncoming: string;
    colReorderAt: string;
    colSoldPerDay: string;
    colValue: string;
    colStatus: string;
    statusOut: string;
    statusReorder: string;
    statusDead: (days: number) => string;
    statusOk: string;
    explainAvailableTitle: string;
    explainAvailableFormula: string;
    explainAvailableBody: string;
    explainReorderTitle: string;
    explainReorderFormula: (lead: number, safety: number) => string;
    explainReorderBody: (window: number) => string;
    explainValueTitle: string;
    explainValueFormula: string;
    explainValueBody: string;
    explainDeadTitle: string;
    explainDeadFormula: (days: number) => string;
    explainDeadBody: string;
  };

  movements: {
    heading: string;
    subtitle: string;
    filterProduct: string;
    filterAllProducts: string;
    filterType: string;
    filterAllTypes: string;
    filterFrom: string;
    filterTo: string;
    filterApply: string;
    filterClear: string;
    emptyTitle: string;
    emptyBody: string;
    emptyFilteredTitle: string;
    emptyFilteredBody: string;
    colWhen: string;
    colProduct: string;
    colType: string;
    colChange: string;
    colBefore: string;
    colAfter: string;
    colReference: string;
    colUnitCost: string;
    colBy: string;
    pageInfo: (page: number, pages: number, total: string) => string;
    prev: string;
    next: string;
    typeSale: string;
    typeCancelRestock: string;
    typeReturn: string;
    typeDamage: string;
    typePurchase: string;
    typeAdjustment: string;
    typeOpening: string;
    noteTitle: string;
    noteBody: string;
  };
}

export const INVENTORY_COPY: Record<InvLang, InventoryCopy> = {
  en: {
    toggleLabel: "বাংলা",

    overview: {
      heading: "Stock Overview",
      subtitle:
        "What you hold, what is promised away, and what is still sellable. Sized products are listed per option — that is where their units actually live.",
      kpiOut: "Out of Stock",
      kpiOutSub: "Nothing left to sell",
      kpiReorder: "Needs Reorder",
      kpiReorderSub: "At or below reorder point",
      kpiDead: "Dead Stock",
      kpiDeadSub: (rows, days) => `${rows} row(s), no sale in ${days}d`,
      kpiValue: "Stock Value",
      kpiValueSub: (onHand, reserved) => `${onHand} on hand · ${reserved} reserved`,
      writeOff: (units) => `${units} unit${units === 1 ? "" : "s"} written off`,
      writeOffTail: (days, value) => ` in the last ${days} days · ${value} at cost`,
      writeOffLink: "View write-offs",
      unknownCost:
        "Some products in stock have no sourcing cost set, so the values above understate what you actually hold. Set a purchase cost on those products to fix the totals.",
      showing: (shown, total) => `Showing ${shown} of ${total} rows`,
      clearFilter: "Clear filter",
      emptyTitle: "No products yet",
      emptyBody: "Stock levels appear here once you add products.",
      emptyAction: "Add a product",
      noMatch: "Nothing matches this filter.",
      digestTitle: "Daily low-stock email",
      digestSub: "Sent to every owner and manager.",
      digestSend: "Send now",
      colProduct: "Product",
      colOnHand: "On Hand",
      colReserved: "Reserved",
      colAvailable: "Available",
      colIncoming: "Incoming",
      colReorderAt: "Reorder At",
      colSoldPerDay: "Sold/day",
      colValue: "Value",
      colStatus: "Status",
      statusOut: "Out of stock",
      statusReorder: "Reorder",
      statusDead: (days) => `No sale ${days}d`,
      statusOk: "OK",
      explainAvailableTitle: "Available",
      explainAvailableFormula: "available = on hand − reserved",
      explainAvailableBody:
        "Reserved units are still in your warehouse but already promised to orders that haven't shipped. The storefront sells against Available — showing On Hand would oversell.",
      explainReorderTitle: "Reorder point",
      explainReorderFormula: (lead, safety) =>
        `(sold/day × ${lead}d lead) + ${safety}d safety`,
      explainReorderBody: (window) =>
        `Computed from the last ${window} days of sales, using each supplier's own lead time where known. Your per-product threshold still applies — whichever is higher wins, so this can never make the shop quieter than you asked.`,
      explainValueTitle: "Stock value",
      explainValueFormula: "on hand × landed cost",
      explainValueBody:
        "Landed cost means what the unit really cost you — supplier price plus shipping and any customs — not just the invoice figure. Receiving a purchase order updates it automatically.",
      explainDeadTitle: "Dead stock",
      explainDeadFormula: (days) => `in stock, no sale in ${days} days`,
      explainDeadBody:
        "Capital sitting still. Inactive products are counted too — money is tied up whether or not the product is listed.",
    },

    movements: {
      heading: "Stock Movements",
      subtitle:
        "Stock is not one number — it is the sum of every change. Each line here is permanent: nothing is ever edited or deleted, so a number that moved can always be explained.",
      filterProduct: "Product",
      filterAllProducts: "All products",
      filterType: "Type",
      filterAllTypes: "All types",
      filterFrom: "From",
      filterTo: "To",
      filterApply: "Filter",
      filterClear: "Clear",
      emptyTitle: "No stock movements yet",
      emptyBody:
        "Movements are recorded automatically as orders ship, get cancelled, or come back.",
      emptyFilteredTitle: "No movements match those filters",
      emptyFilteredBody: "Try widening the date range or clearing the filters.",
      colWhen: "When",
      colProduct: "Product",
      colType: "Type",
      colChange: "Change",
      colBefore: "Before",
      colAfter: "After",
      colReference: "Reference",
      colUnitCost: "Unit Cost",
      colBy: "By",
      pageInfo: (page, pages, total) => `Page ${page} of ${pages} · ${total} movement(s)`,
      prev: "Previous",
      next: "Next",
      typeSale: "Sale",
      typeCancelRestock: "Order cancelled",
      typeReturn: "Returned",
      typeDamage: "Damaged",
      typePurchase: "Received",
      typeAdjustment: "Correction",
      typeOpening: "Opening",
      noteTitle: "Physical count doesn't match?",
      noteBody:
        "If the system says 100 and you count 97 on the shelf, don't edit the number directly. Enter a −3 Adjustment on the product instead — then six months from now you can still see why it dropped.",
    },
  },

  bn: {
    toggleLabel: "English",

    overview: {
      heading: "স্টক সারসংক্ষেপ",
      subtitle:
        "গুদামে কত আছে, কতটা অর্ডারে বুক করা, আর কতটা এখনো বিক্রি করা যাবে। সাইজ/কালার থাকলে প্রতিটি অপশন আলাদা সারিতে — কারণ স্টক আসলে ওখানেই থাকে।",
      kpiOut: "স্টক শেষ",
      kpiOutSub: "বিক্রি করার মতো কিছু নেই",
      kpiReorder: "রি-অর্ডার দরকার",
      kpiReorderSub: "রি-অর্ডার পয়েন্টে নেমে এসেছে",
      kpiDead: "ডেডস্টক",
      kpiDeadSub: (rows, days) => `${rows}টি পণ্য, ${days} দিনে বিক্রি নেই`,
      kpiValue: "স্টকের মূল্য",
      kpiValueSub: (onHand, reserved) => `${onHand} গুদামে · ${reserved} বুক করা`,
      writeOff: (units) => `${units}টি ইউনিট রাইট-অফ হয়েছে`,
      writeOffTail: (days, value) => ` — গত ${days} দিনে · ক্রয়মূল্যে ${value}`,
      writeOffLink: "রাইট-অফ দেখুন",
      unknownCost:
        "স্টকে থাকা কিছু পণ্যের ক্রয়মূল্য দেওয়া নেই, তাই উপরের হিসাব আসল মূল্যের চেয়ে কম দেখাচ্ছে। ওই পণ্যগুলোতে ক্রয়মূল্য বসালে হিসাব ঠিক হয়ে যাবে।",
      showing: (shown, total) => `${total}টির মধ্যে ${shown}টি দেখানো হচ্ছে`,
      clearFilter: "ফিল্টার মুছুন",
      emptyTitle: "এখনো কোনো পণ্য নেই",
      emptyBody: "পণ্য যোগ করলে এখানে স্টক দেখা যাবে।",
      emptyAction: "পণ্য যোগ করুন",
      noMatch: "এই ফিল্টারে কিছু পাওয়া যায়নি।",
      digestTitle: "প্রতিদিনের লো-স্টক ইমেইল",
      digestSub: "সব ওনার ও ম্যানেজারের কাছে যাবে।",
      digestSend: "এখনই পাঠান",
      colProduct: "পণ্য",
      colOnHand: "গুদামে",
      colReserved: "বুক করা",
      colAvailable: "বিক্রয়যোগ্য",
      colIncoming: "আসছে",
      colReorderAt: "রি-অর্ডার পয়েন্ট",
      colSoldPerDay: "দৈনিক বিক্রি",
      colValue: "মূল্য",
      colStatus: "অবস্থা",
      statusOut: "স্টক শেষ",
      statusReorder: "রি-অর্ডার দিন",
      statusDead: (days) => `${days} দিন বিক্রি নেই`,
      statusOk: "ঠিক আছে",
      explainAvailableTitle: "বিক্রয়যোগ্য কীভাবে বের হয়",
      explainAvailableFormula: "বিক্রয়যোগ্য = গুদামে − বুক করা",
      explainAvailableBody:
        "গুদামে ৯৭টি শার্ট আছে, কিন্তু ৩০টি আগের অর্ডারে বুক করা। ওয়েবসাইট দেখাবে ৬৭টি। ৯৭ দেখালে ওভারসেল হয়ে যাবে — যে মাল নেই সেটাও বিক্রি হয়ে যাবে।",
      explainReorderTitle: "রি-অর্ডার পয়েন্ট",
      explainReorderFormula: (lead, safety) =>
        `(দৈনিক বিক্রি × ${lead} দিন লিড টাইম) + ${safety} দিন সেফটি`,
      explainReorderBody: (window) =>
        `গত ${window} দিনের বিক্রি থেকে হিসাব করা, আর সাপ্লায়ারের নিজের লিড টাইম জানা থাকলে সেটাই ধরা হয়। আপনার নিজের সেট করা থ্রেশহোল্ডও কাজ করে — যেটা বেশি সেটাই মানা হয়, তাই এটা কখনো আপনার চাওয়ার চেয়ে কম সতর্ক করবে না।`,
      explainValueTitle: "ল্যান্ডেড কস্ট",
      explainValueFormula: "গুদামে × ল্যান্ডেড কস্ট",
      explainValueBody:
        "সাপ্লায়ার দাম + শিপিং + কাস্টমস — শুধু ইনভয়েসের দাম নয়। ৫০০ + ৫০ + ৩০ = ৫৮০। লাভ হিসাব করার সময় ৫০০ নয়, ৫৮০ ধরতে হবে। পারচেজ অর্ডার রিসিভ করলে এটা নিজে থেকেই আপডেট হয়।",
      explainDeadTitle: "ডেডস্টক",
      explainDeadFormula: (days) => `স্টকে আছে, ${days} দিনে বিক্রি নেই`,
      explainDeadBody:
        "আটকে থাকা টাকা। ইনঅ্যাক্টিভ পণ্যও ধরা হয় — ওয়েবসাইটে দেখা যাক বা না যাক, টাকা তো আটকেই আছে।",
    },

    movements: {
      heading: "স্টক মুভমেন্ট",
      subtitle:
        "স্টক একটা সংখ্যা নয় — সব পরিবর্তনের যোগফল। প্রতিটি লাইন স্থায়ী, কখনো এডিট বা ডিলিট হয় না, তাই কোন সংখ্যা কেন বদলাল সেটা সবসময় জানা যাবে।",
      filterProduct: "পণ্য",
      filterAllProducts: "সব পণ্য",
      filterType: "ধরন",
      filterAllTypes: "সব ধরন",
      filterFrom: "শুরু",
      filterTo: "শেষ",
      filterApply: "ফিল্টার",
      filterClear: "মুছুন",
      emptyTitle: "এখনো কোনো স্টক মুভমেন্ট নেই",
      emptyBody:
        "অর্ডার শিপ হলে, বাতিল হলে বা ফেরত এলে এখানে নিজে থেকেই রেকর্ড হবে।",
      emptyFilteredTitle: "এই ফিল্টারে কিছু পাওয়া যায়নি",
      emptyFilteredBody: "তারিখের সীমা বাড়িয়ে দেখুন বা ফিল্টার মুছে দিন।",
      colWhen: "তারিখ",
      colProduct: "পণ্য",
      colType: "ধরন",
      colChange: "পরিমাণ",
      colBefore: "আগে",
      colAfter: "পরে",
      colReference: "রেফারেন্স",
      colUnitCost: "ইউনিট কস্ট",
      colBy: "কে",
      pageInfo: (page, pages, total) => `পৃষ্ঠা ${page} / ${pages} · মোট ${total}টি`,
      prev: "আগের",
      next: "পরের",
      typeSale: "বিক্রি",
      typeCancelRestock: "অর্ডার বাতিল",
      typeReturn: "ফেরত",
      typeDamage: "নষ্ট",
      typePurchase: "রিসিভ",
      typeAdjustment: "সংশোধন",
      typeOpening: "প্রারম্ভিক",
      noteTitle: "ফিজিক্যাল কাউন্ট মিলছে না?",
      noteBody:
        "সিস্টেম বলছে ১০০, গুদামে পাওয়া গেল ৯৭। সরাসরি ডেটাবেসে stock = 97 লিখবেন না। একটা −৩ সংশোধন এন্ট্রি দিন — তাহলে ছয় মাস পরেও জানা যাবে কেন কমেছে।",
    },
  },
};
