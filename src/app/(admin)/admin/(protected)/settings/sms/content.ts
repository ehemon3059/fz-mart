// Page-local bilingual copy for the SMS Gateway settings page.
// The in-page language toggle switches between these two dictionaries; it does
// not touch the site-wide NEXT_LOCALE cookie — it only affects this page.

export type SmsLang = "en" | "bn";

export interface SmsCopy {
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
    senderIdLabel: string;
    senderIdPlaceholder: string;
    saved: string;
    save: string;
    saving: string;
  };
}

export const SMS_COPY: Record<SmsLang, SmsCopy> = {
  en: {
    toggleLabel: "বাংলা",
    heading: "SMS Gateway",
    configured: "Gateway configured — sends go live.",
    notConfigured: "No provider configured — sends are logged to console.",
    cards: [
      {
        title: "What is SMS Gateway?",
        body: "A service that lets your store send text messages — order confirmations, OTPs, delivery updates — straight to a customer's phone via an API, instead of through an app like WhatsApp.",
      },
      {
        title: "Why need SMS Gateway?",
        body: "Most customers in BD don't watch email, but they always see SMS. It confirms orders instantly, reduces fake/cancelled COD orders, and builds trust without needing the customer to install anything.",
      },
      {
        title: "Where to get one?",
        body: "Local BD providers like SSL Wireless, Alpha SMS, BulkSMSBD, REVE Systems, or Banglalink/Grameenphone's masking SMS API. Sign up, complete KYC, and you'll get an API URL, API key, and a sender ID (mask).",
      },
      {
        title: "How to setup?",
        body: "Paste the provider's send-SMS API URL, your API key, and approved sender ID below. Leave the API URL blank during development — sends will be logged to the console instead of actually going out.",
      },
    ],
    form: {
      heading: "Provider credentials",
      subtitle: "These keys are used by the order queue to send SMS — only fill in once your provider account is ready.",
      apiUrlLabel: "Provider API URL",
      apiUrlPlaceholder: "https://api.smsprovider.com/send",
      apiUrlHelp: "Leave blank to stub-log sends instead of sending.",
      apiKeyLabel: "API Key",
      apiKeyKeepPlaceholder: "Leave blank to keep current key",
      apiKeyPlaceholder: "Your provider API key",
      senderIdLabel: "Sender ID",
      senderIdPlaceholder: "fz-mart",
      saved: "Saved.",
      save: "Save",
      saving: "Saving...",
    },
  },
  bn: {
    toggleLabel: "English",
    heading: "এসএমএস গেটওয়ে",
    configured: "গেটওয়ে কনফিগার করা হয়েছে — এসএমএস লাইভ পাঠানো হচ্ছে।",
    notConfigured: "কোনো প্রোভাইডার কনফিগার করা নেই — এসএমএস কনসোলে লগ করা হচ্ছে।",
    cards: [
      {
        title: "এসএমএস গেটওয়ে কী?",
        body: "এটি এমন একটি সার্ভিস যা আপনার স্টোরকে টেক্সট মেসেজ পাঠাতে দেয় — অর্ডার নিশ্চিতকরণ, ওটিপি, ডেলিভারি আপডেট — একটি এপিআইয়ের মাধ্যমে সরাসরি গ্রাহকের ফোনে, WhatsApp-এর মতো কোনো অ্যাপের বদলে।",
      },
      {
        title: "এসএমএস গেটওয়ে কেন দরকার?",
        body: "বাংলাদেশের অধিকাংশ গ্রাহক ইমেইল দেখেন না, কিন্তু এসএমএস সবসময় দেখেন। এটি তাৎক্ষণিকভাবে অর্ডার নিশ্চিত করে, ভুয়া/বাতিল ক্যাশ অন ডেলিভারি অর্ডার কমায়, এবং গ্রাহককে কিছু ইনস্টল না করিয়েই আস্থা তৈরি করে।",
      },
      {
        title: "কোথায় পাওয়া যাবে?",
        body: "বাংলাদেশের প্রোভাইডার যেমন SSL Wireless, Alpha SMS, BulkSMSBD, REVE Systems, অথবা Banglalink/Grameenphone-এর মাস্কিং এসএমএস এপিআই। সাইন আপ করুন, কেওয়াইসি সম্পন্ন করুন, এবং আপনি একটি এপিআই ইউআরএল, এপিআই কী ও একটি সেন্ডার আইডি (মাস্ক) পাবেন।",
      },
      {
        title: "কীভাবে সেটআপ করবেন?",
        body: "নিচে প্রোভাইডারের সেন্ড-এসএমএস এপিআই ইউআরএল, আপনার এপিআই কী ও অনুমোদিত সেন্ডার আইডি পেস্ট করুন। ডেভেলপমেন্টের সময় এপিআই ইউআরএল খালি রাখুন — এসএমএস আসলে না পাঠিয়ে কনসোলে লগ করা হবে।",
      },
    ],
    form: {
      heading: "প্রোভাইডার ক্রেডেনশিয়াল",
      subtitle: "এই কী গুলো অর্ডার কিউ এসএমএস পাঠাতে ব্যবহার করে — আপনার প্রোভাইডার অ্যাকাউন্ট প্রস্তুত হলেই কেবল পূরণ করুন।",
      apiUrlLabel: "প্রোভাইডার এপিআই ইউআরএল",
      apiUrlPlaceholder: "https://api.smsprovider.com/send",
      apiUrlHelp: "খালি রাখলে এসএমএস না পাঠিয়ে স্টাব-লগ করা হবে।",
      apiKeyLabel: "এপিআই কী",
      apiKeyKeepPlaceholder: "বর্তমান কী রাখতে খালি রাখুন",
      apiKeyPlaceholder: "আপনার প্রোভাইডার এপিআই কী",
      senderIdLabel: "সেন্ডার আইডি",
      senderIdPlaceholder: "fz-mart",
      saved: "সংরক্ষিত হয়েছে।",
      save: "সংরক্ষণ করুন",
      saving: "সংরক্ষণ হচ্ছে...",
    },
  },
};
