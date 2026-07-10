// Page-local bilingual copy for the Fraud Check API settings page.
// The in-page language toggle switches between these two dictionaries; it does
// not touch the site-wide NEXT_LOCALE cookie — it only affects this page.

export type FraudLang = "en" | "bn";

export interface FraudCopy {
  toggleLabel: string;
  heading: string;
  configured: string;
  notConfigured: string;
  cards: { title: string; body: string }[];
  form: {
    heading: string;
    subtitle: string;
    apiUrlLabel: string;
    apiUrlPlaceholder: string;
    apiUrlHelp: string;
    apiKeyLabel: string;
    apiKeyKeepPlaceholder: string;
    apiKeyPlaceholder: string;
    saved: string;
    save: string;
    saving: string;
  };
}

export const FRAUD_COPY: Record<FraudLang, FraudCopy> = {
  en: {
    toggleLabel: "বাংলা",
    heading: "Fraud Check API",
    configured: "Provider configured — checks run live.",
    notConfigured: "No provider configured — checks return a neutral, zero-risk result.",
    cards: [
      {
        title: "What is Fraud Check API?",
        body: "A service that scores a customer's phone number against known fraud/return patterns — fake orders, chronic COD refusers, abusive return history — and returns a risk level you can see before the order ships.",
      },
      {
        title: "Why need Fraud Check API?",
        body: "COD stores lose money to fake orders and repeat refusers. A risk score on the order list lets staff call to confirm or hold high-risk orders before dispatch, instead of finding out after the courier is already on the way.",
      },
      {
        title: "Where to get one?",
        body: "BD-focused options include Cloud Fraud Check, ShareTrip's Fraud Checker, or general SMS/courier providers (Steadfast, Pathao) that also expose a phone-risk lookup endpoint. Sign up for a merchant account to get an API URL and key.",
      },
      {
        title: "How to setup?",
        body: "Paste the provider's API URL and key below. The check runs once per customer phone at checkout, is cached, and never blocks an order — it only adds a risk indicator on the order list and detail pages for staff to review.",
      },
    ],
    form: {
      heading: "Provider credentials",
      subtitle: "Checked once per customer phone at checkout — never blocks the order, only flags risk on the order pages.",
      apiUrlLabel: "API URL",
      apiUrlPlaceholder: "https://api.fraudcheck.example",
      apiUrlHelp: "Leave blank to stub a neutral, zero-risk result instead of calling.",
      apiKeyLabel: "API Key",
      apiKeyKeepPlaceholder: "Leave blank to keep current key",
      apiKeyPlaceholder: "Your provider API key",
      saved: "Saved.",
      save: "Save",
      saving: "Saving...",
    },
  },
  bn: {
    toggleLabel: "English",
    heading: "ফ্রড চেক এপিআই",
    configured: "প্রোভাইডার কনফিগার করা হয়েছে — চেক লাইভ চলছে।",
    notConfigured: "কোনো প্রোভাইডার কনফিগার করা নেই — চেক নিরপেক্ষ, ঝুঁকিমুক্ত ফলাফল দেয়।",
    cards: [
      {
        title: "ফ্রড চেক এপিআই কী?",
        body: "এটি এমন একটি সার্ভিস যা গ্রাহকের ফোন নম্বরকে পরিচিত ফ্রড/রিটার্ন প্যাটার্নের সাথে যাচাই করে — ভুয়া অর্ডার, বারবার ক্যাশ অন ডেলিভারি প্রত্যাখ্যানকারী, অপব্যবহারমূলক রিটার্ন ইতিহাস — এবং অর্ডার পাঠানোর আগেই একটি ঝুঁকির মাত্রা দেখায়।",
      },
      {
        title: "ফ্রড চেক এপিআই কেন দরকার?",
        body: "ক্যাশ অন ডেলিভারি স্টোরগুলো ভুয়া অর্ডার ও বারবার প্রত্যাখ্যানকারীদের কারণে লোকসান করে। অর্ডার তালিকায় ঝুঁকির স্কোর থাকলে কর্মীরা পাঠানোর আগে উচ্চ-ঝুঁকির অর্ডার ফোন করে নিশ্চিত বা আটকে রাখতে পারে, কুরিয়ার রওনা হওয়ার পরে জানতে হয় না।",
      },
      {
        title: "কোথায় পাওয়া যাবে?",
        body: "বাংলাদেশ-কেন্দ্রিক অপশনের মধ্যে আছে Cloud Fraud Check, ShareTrip-এর Fraud Checker, অথবা সাধারণ এসএমএস/কুরিয়ার প্রোভাইডার (Steadfast, Pathao) যারা ফোন-ঝুঁকি যাচাইয়ের এন্ডপয়েন্টও দেয়। একটি মার্চেন্ট অ্যাকাউন্ট খুলে এপিআই ইউআরএল ও কী সংগ্রহ করুন।",
      },
      {
        title: "কীভাবে সেটআপ করবেন?",
        body: "নিচে প্রোভাইডারের এপিআই ইউআরএল ও কী পেস্ট করুন। চেকআউটে প্রতি গ্রাহক ফোনে একবার চেক চলে, ক্যাশ করা হয়, এবং কখনো অর্ডার আটকায় না — শুধু কর্মীদের পর্যালোচনার জন্য অর্ডার তালিকা ও বিস্তারিত পেজে ঝুঁকির নির্দেশক যোগ করে।",
      },
    ],
    form: {
      heading: "প্রোভাইডার ক্রেডেনশিয়াল",
      subtitle: "চেকআউটে প্রতি গ্রাহক ফোনে একবার যাচাই করা হয় — কখনো অর্ডার আটকায় না, শুধু অর্ডার পেজে ঝুঁকি চিহ্নিত করে।",
      apiUrlLabel: "এপিআই ইউআরএল",
      apiUrlPlaceholder: "https://api.fraudcheck.example",
      apiUrlHelp: "খালি রাখলে কল না করে নিরপেক্ষ, ঝুঁকিমুক্ত ফলাফল ব্যবহার করা হবে।",
      apiKeyLabel: "এপিআই কী",
      apiKeyKeepPlaceholder: "বর্তমান কী রাখতে খালি রাখুন",
      apiKeyPlaceholder: "আপনার প্রোভাইডার এপিআই কী",
      saved: "সংরক্ষিত হয়েছে।",
      save: "সংরক্ষণ করুন",
      saving: "সংরক্ষণ হচ্ছে...",
    },
  },
};
