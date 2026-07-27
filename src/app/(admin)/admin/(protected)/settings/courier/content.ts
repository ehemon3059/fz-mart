// Page-local bilingual copy for the Courier API settings page.
// The in-page language toggle switches between these two dictionaries; it does
// not touch the site-wide NEXT_LOCALE cookie — it only affects this page.

export type CourierLang = "en" | "bn";

export interface CourierCopy {
  toggleLabel: string;
  heading: string;
  connected: (provider: string) => string;
  notConfigured: string;
  cards: { title: string; body: string }[];
  form: {
    heading: string;
    subtitle: string;
    providerLabel: string;
    providerPlaceholder: string;
    apiUrlLabel: string;
    apiUrlPlaceholder: string;
    apiUrlHelp: string;
    apiKeyLabel: string;
    apiKeyKeepPlaceholder: string;
    apiKeyPlaceholder: string;
    secretKeyLabel: string;
    secretKeyKeepPlaceholder: string;
    secretKeyPlaceholder: string;
    webhookLabel: string;
    webhookKeepPlaceholder: string;
    webhookPlaceholder: string;
    webhookHelpPrefix: string;
    testModeLabel: string;
    testModeOnHelp: string;
    testModeOffHelp: string;
    testConnection: string;
    testing: string;
    testOk: string;
    saved: string;
    save: string;
    saving: string;
  };
}

export const COURIER_COPY: Record<CourierLang, CourierCopy> = {
  en: {
    toggleLabel: "বাংলা",
    heading: "Courier API",
    connected: (provider) => `${provider || "Provider"} connected — consignments go live.`,
    notConfigured: "No provider configured — consignments are logged to console.",
    cards: [
      {
        title: "Why need Courier API?",
        body: "It connects your store directly to a delivery company so orders are pushed to them automatically — no manual data entry — and their status updates (picked up, in transit, delivered, returned) flow back into your order page in real time.",
      },
      {
        title: "Where to get one?",
        body: "Local BD courier services like Steadfast, Pathao Courier, and RedX all offer a merchant API. Sign up for a business account, complete KYC, and they'll issue the credentials (API key, or client id/secret for Pathao) from their merchant dashboard.",
      },
      {
        title: "How to setup?",
        body: "Fill in the credentials in each provider's card below and click Save — Save also runs a live Test Connection, so a wrong key can't be stored. Webhook secret is optional: set it only if your provider signs its status callbacks, then point their webhook setting to the URL shown on that card. Steadfast does not sign callbacks — leave its webhook secret blank and use Refresh Status on the order page. You can configure all three providers.",
      },
      {
        title: "Which provider is active?",
        body: "Only ONE provider is active at a time — it's the default courier pre-selected for NEW consignments. A provider stays disabled in the Active-provider selector until you save its credentials. Switching the active provider never touches already-shipped orders: each order keeps the courier it was created with, so Refresh Status and webhooks always follow that original provider. When two or more providers are configured, you can still pick any of them per-order on the order page's Create Shipment panel — the active one is just the default.",
      },
    ],
    form: {
      heading: "Steadfast Courier",
      subtitle: "These keys are used to push consignments and verify delivery-status callbacks.",
      providerLabel: "Provider Name",
      providerPlaceholder: "e.g. Steadfast",
      apiUrlLabel: "API URL",
      apiUrlPlaceholder: "https://api.courier.example/v1",
      apiUrlHelp: "Leave blank to stub-log requests instead of sending.",
      apiKeyLabel: "API Key",
      apiKeyKeepPlaceholder: "Leave blank to keep current key",
      apiKeyPlaceholder: "Your provider API key",
      secretKeyLabel: "Secret Key",
      secretKeyKeepPlaceholder: "Leave blank to keep current secret",
      secretKeyPlaceholder: "Your provider secret key",
      webhookLabel: "Webhook Secret (optional)",
      webhookKeepPlaceholder: "Leave blank to keep current secret",
      webhookPlaceholder: "Leave blank — Steadfast sends no signed callbacks",
      webhookHelpPrefix: "Only needed if your provider signs status callbacks. Steadfast does not, so leave this blank and use Refresh on the order page. Webhook URL:",
      testModeLabel: "Test mode (simulator)",
      testModeOnHelp:
        "ON — consignments are faked locally and NOTHING is sent to Steadfast. No parcel is created, no COD is collected. Shipments are marked TEST and you can force their status from the order page. Credentials below are ignored while this is on.",
      testModeOffHelp:
        "OFF — live mode. Creating a consignment sends a real request to Steadfast and a real parcel will be picked up and delivered. Turn this on to try the flow end-to-end without shipping anything.",
      testConnection: "Test Connection",
      testing: "Testing...",
      testOk: "Connection successful — credentials are valid.",
      saved: "Saved.",
      save: "Save",
      saving: "Saving...",
    },
  },
  bn: {
    toggleLabel: "English",
    heading: "কুরিয়ার এপিআই",
    connected: (provider) => `${provider || "প্রোভাইডার"} সংযুক্ত — কনসাইনমেন্ট লাইভ চলছে।`,
    notConfigured: "কোনো প্রোভাইডার কনফিগার করা নেই — কনসাইনমেন্ট কনসোলে লগ করা হচ্ছে।",
    cards: [
      {
        title: "কুরিয়ার এপিআই কেন দরকার?",
        body: "এটি আপনার স্টোরকে সরাসরি একটি ডেলিভারি কোম্পানির সাথে যুক্ত করে, ফলে অর্ডার স্বয়ংক্রিয়ভাবে তাদের কাছে পাঠানো হয় — হাতে ডেটা এন্ট্রির দরকার নেই — এবং তাদের স্ট্যাটাস আপডেট (পিকআপ, ট্রানজিটে, ডেলিভার্ড, রিটার্ন) রিয়েল টাইমে আপনার অর্ডার পেজে ফিরে আসে।",
      },
      {
        title: "কোথায় পাওয়া যাবে?",
        body: "বাংলাদেশের কুরিয়ার সার্ভিস যেমন Steadfast, Pathao Courier, ও RedX সবাই মার্চেন্ট এপিআই দেয়। একটি বিজনেস অ্যাকাউন্ট খুলুন, কেওয়াইসি সম্পন্ন করুন, এবং তারা তাদের মার্চেন্ট ড্যাশবোর্ড থেকে ক্রেডেনশিয়াল (এপিআই কী, অথবা Pathao-র জন্য ক্লায়েন্ট আইডি/সিক্রেট) দেবে।",
      },
      {
        title: "কীভাবে সেটআপ করবেন?",
        body: "নিচে প্রতিটি প্রোভাইডারের কার্ডে ক্রেডেনশিয়াল দিয়ে Save চাপুন — Save করার সময় লাইভ টেস্ট কানেকশন চলে, তাই ভুল কী সংরক্ষণ হবে না। ওয়েবহুক সিক্রেট ঐচ্ছিক: শুধু তখনই দিন যদি আপনার প্রোভাইডার স্ট্যাটাস-কলব্যাক সাইন করে, তারপর তাদের ওয়েবহুক সেটিং সেই কার্ডে দেখানো ইউআরএলে নির্দেশ করুন। Steadfast কলব্যাক সাইন করে না — এর ওয়েবহুক সিক্রেট খালি রাখুন এবং অর্ডার পেজের Refresh Status ব্যবহার করুন। আপনি তিনটি প্রোভাইডারই কনফিগার করতে পারেন।",
      },
      {
        title: "কোন প্রোভাইডার সক্রিয়?",
        body: "একসাথে শুধুমাত্র একটি প্রোভাইডার সক্রিয় থাকে — এটি নতুন কনসাইনমেন্টের জন্য ডিফল্টভাবে নির্বাচিত কুরিয়ার। ক্রেডেনশিয়াল সেভ না করা পর্যন্ত প্রোভাইডারটি Active-provider নির্বাচকে নিষ্ক্রিয় থাকে। সক্রিয় প্রোভাইডার পরিবর্তন করলে আগে পাঠানো অর্ডারে কোনো প্রভাব পড়ে না: প্রতিটি অর্ডার যে কুরিয়ারে তৈরি হয়েছে সেটিই ধরে রাখে, তাই Refresh Status ও ওয়েবহুক সবসময় সেই মূল প্রোভাইডারই অনুসরণ করে। দুই বা তার বেশি প্রোভাইডার কনফিগার থাকলে অর্ডার পেজের Create Shipment প্যানেল থেকে যেকোনো একটি বেছে নিতে পারবেন — সক্রিয়টি শুধু ডিফল্ট।",
      },
    ],
    form: {
      heading: "Steadfast কুরিয়ার",
      subtitle: "এই কী গুলো কনসাইনমেন্ট পাঠাতে এবং ডেলিভারি-স্ট্যাটাস কলব্যাক যাচাই করতে ব্যবহৃত হয়।",
      providerLabel: "প্রোভাইডারের নাম",
      providerPlaceholder: "যেমন Steadfast",
      apiUrlLabel: "এপিআই ইউআরএল",
      apiUrlPlaceholder: "https://api.courier.example/v1",
      apiUrlHelp: "খালি রাখলে রিকোয়েস্ট না পাঠিয়ে স্টাব-লগ করা হবে।",
      apiKeyLabel: "এপিআই কী",
      apiKeyKeepPlaceholder: "বর্তমান কী রাখতে খালি রাখুন",
      apiKeyPlaceholder: "আপনার প্রোভাইডার এপিআই কী",
      secretKeyLabel: "সিক্রেট কী",
      secretKeyKeepPlaceholder: "বর্তমান সিক্রেট রাখতে খালি রাখুন",
      secretKeyPlaceholder: "আপনার প্রোভাইডার সিক্রেট কী",
      webhookLabel: "ওয়েবহুক সিক্রেট (ঐচ্ছিক)",
      webhookKeepPlaceholder: "বর্তমান সিক্রেট রাখতে খালি রাখুন",
      webhookPlaceholder: "খালি রাখুন — Steadfast সাইনড কলব্যাক পাঠায় না",
      webhookHelpPrefix: "শুধু তখনই প্রয়োজন যদি আপনার প্রোভাইডার স্ট্যাটাস-কলব্যাক সাইন করে। Steadfast করে না, তাই এটি খালি রাখুন এবং অর্ডার পেজের রিফ্রেশ ব্যবহার করুন। ওয়েবহুক ইউআরএল:",
      testModeLabel: "টেস্ট মোড (সিমুলেটর)",
      testModeOnHelp:
        "চালু — কনসাইনমেন্ট স্থানীয়ভাবে নকল করা হয়, Steadfast-এ কিছুই পাঠানো হয় না। কোনো পার্সেল তৈরি হয় না, কোনো ক্যাশ অন ডেলিভারি নেওয়া হয় না। শিপমেন্টগুলো TEST চিহ্নিত থাকে এবং অর্ডার পেজ থেকে স্ট্যাটাস পরিবর্তন করা যায়। এটি চালু থাকলে নিচের ক্রেডেনশিয়াল উপেক্ষা করা হয়।",
      testModeOffHelp:
        "বন্ধ — লাইভ মোড। কনসাইনমেন্ট তৈরি করলে Steadfast-এ আসল রিকোয়েস্ট যায় এবং সত্যিকারের পার্সেল পিকআপ ও ডেলিভারি হবে। কিছু না পাঠিয়ে পুরো প্রসেস পরীক্ষা করতে চাইলে এটি চালু করুন।",
      testConnection: "কানেকশন টেস্ট করুন",
      testing: "টেস্ট হচ্ছে...",
      testOk: "কানেকশন সফল — ক্রেডেনশিয়াল সঠিক।",
      saved: "সংরক্ষিত হয়েছে।",
      save: "সংরক্ষণ করুন",
      saving: "সংরক্ষণ হচ্ছে...",
    },
  },
};
