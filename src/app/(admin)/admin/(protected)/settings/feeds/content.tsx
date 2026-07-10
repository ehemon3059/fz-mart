// Page-local bilingual copy for the Marketing Feeds settings page.
// The in-page language toggle switches between these two dictionaries; it does
// not touch the site-wide NEXT_LOCALE cookie — it only affects this page.

import type { ReactNode } from "react";

export type FeedsLang = "en" | "bn";

export interface FeedsCopy {
  toggleLabel: string;
  heading: string;
  intro: string;
  localhost: {
    title: string;
    body: ReactNode; // contains the inline Link to Appearance settings
  };
  about: {
    heading: string;
    body: string;
    whyHeading: string;
    benefits: { title: string; body: string }[];
    howHeading: string;
    steps: ReactNode[];
    tokenNote: string;
  };
  panel: {
    facebookLabel: string;
    googleLabel: string;
    note: string;
    copy: string;
    copied: string;
    regenerate: string;
    regenerating: string;
    confirm: string;
  };
}

export function buildCopy(lang: FeedsLang, appearanceLink: ReactNode): FeedsCopy {
  return lang === "en" ? enCopy(appearanceLink) : bnCopy(appearanceLink);
}

function enCopy(appearanceLink: ReactNode): FeedsCopy {
  return {
    toggleLabel: "বাংলা",
    heading: "Marketing Feeds",
    intro:
      "Token-protected product feeds for Facebook Catalog and Google Merchant. They update automatically as you edit products.",
    localhost: {
      title: "These URLs point to localhost — not usable by Facebook or Google.",
      body: (
        <>
          Once your store is live on its own domain, set it in {appearanceLink}. The feed URLs below update to
          your real domain automatically — no code changes needed.
        </>
      ),
    },
    about: {
      heading: "What is a marketing feed?",
      body: "A marketing feed is an auto-generated list of every active product in your store — title, price, image, stock and link — in the exact format Facebook and Google require. You give them the URL once, and they read your latest products from it on a schedule. It's how your catalogue powers ads and shopping listings without any manual export.",
      whyHeading: "Why use it",
      benefits: [
        {
          title: "Run product ads",
          body: "Facebook/Instagram dynamic ads and Google Shopping both need a product feed to show your items with photo and price.",
        },
        {
          title: "Always up to date",
          body: "Prices, stock, sale prices and images regenerate from your live products — no manual re-uploading of spreadsheets.",
        },
        {
          title: "Sell where people shop",
          body: "Your products can appear in the Facebook/Instagram shop and Google's free Shopping listings.",
        },
      ],
      howHeading: "How to use",
      steps: [
        "Copy a feed URL below (Facebook or Google).",
        <>
          In Facebook Commerce Manager or Google Merchant Center, add a “scheduled feed” and paste the URL.
        </>,
        "Set it to refresh daily — your catalogue then stays in sync automatically.",
      ],
      tokenNote:
        "The URLs include a secret token, so only Facebook and Google can read your feed. Keep them private; regenerate the token below if a URL is ever leaked.",
    },
    panel: {
      facebookLabel: "Facebook Catalog (CSV)",
      googleLabel: "Google Merchant (XML)",
      note: "These URLs contain a secret token. Paste them into Facebook Commerce Manager and Google Merchant Center as scheduled feeds.",
      copy: "Copy",
      copied: "Copied",
      regenerate: "Regenerate token",
      regenerating: "Regenerating…",
      confirm:
        "Regenerate the feed token? The old feed URLs will stop working and you must update them in Facebook / Google Merchant.",
    },
  };
}

function bnCopy(appearanceLink: ReactNode): FeedsCopy {
  return {
    toggleLabel: "English",
    heading: "মার্কেটিং ফিড",
    intro:
      "Facebook Catalog ও Google Merchant-এর জন্য টোকেন-সুরক্ষিত প্রোডাক্ট ফিড। আপনি প্রোডাক্ট সম্পাদনা করলে এগুলো স্বয়ংক্রিয়ভাবে আপডেট হয়।",
    localhost: {
      title: "এই URL গুলো localhost-এ নির্দেশ করে — Facebook বা Google ব্যবহার করতে পারবে না।",
      body: (
        <>
          আপনার স্টোর নিজের ডোমেইনে লাইভ হলে, এটি {appearanceLink}-এ সেট করুন। নিচের ফিড URL গুলো স্বয়ংক্রিয়ভাবে
          আপনার আসল ডোমেইনে আপডেট হবে — কোনো কোড পরিবর্তন লাগবে না।
        </>
      ),
    },
    about: {
      heading: "মার্কেটিং ফিড কী?",
      body: "মার্কেটিং ফিড হলো আপনার স্টোরের প্রতিটি সক্রিয় প্রোডাক্টের একটি স্বয়ংক্রিয়ভাবে তৈরি তালিকা — শিরোনাম, দাম, ছবি, স্টক ও লিঙ্ক — Facebook ও Google যে ফরম্যাট চায় ঠিক সেই ফরম্যাটে। আপনি একবার URL দিলে তারা সেখান থেকে নির্ধারিত সময়ে আপনার সর্বশেষ প্রোডাক্ট পড়ে নেয়। কোনো ম্যানুয়াল এক্সপোর্ট ছাড়াই এভাবে আপনার ক্যাটালগ বিজ্ঞাপন ও শপিং লিস্টিং চালায়।",
      whyHeading: "কেন ব্যবহার করবেন",
      benefits: [
        {
          title: "প্রোডাক্ট বিজ্ঞাপন চালান",
          body: "Facebook/Instagram ডাইনামিক অ্যাড ও Google Shopping — দুটোরই আপনার পণ্য ছবি ও দামসহ দেখাতে একটি প্রোডাক্ট ফিড লাগে।",
        },
        {
          title: "সবসময় হালনাগাদ",
          body: "দাম, স্টক, সেল প্রাইস ও ছবি আপনার লাইভ প্রোডাক্ট থেকে পুনরায় তৈরি হয় — স্প্রেডশিট বারবার আপলোড করতে হয় না।",
        },
        {
          title: "মানুষ যেখানে কেনে সেখানে বিক্রি করুন",
          body: "আপনার পণ্য Facebook/Instagram শপ ও Google-এর ফ্রি Shopping লিস্টিংয়ে দেখা যেতে পারে।",
        },
      ],
      howHeading: "কীভাবে ব্যবহার করবেন",
      steps: [
        "নিচ থেকে একটি ফিড URL কপি করুন (Facebook বা Google)।",
        <>
          Facebook Commerce Manager বা Google Merchant Center-এ একটি “scheduled feed” যোগ করে URL টি পেস্ট করুন।
        </>,
        "এটি প্রতিদিন রিফ্রেশ হতে সেট করুন — তখন আপনার ক্যাটালগ স্বয়ংক্রিয়ভাবে সিঙ্কে থাকে।",
      ],
      tokenNote:
        "URL গুলোতে একটি গোপন টোকেন থাকে, তাই কেবল Facebook ও Google আপনার ফিড পড়তে পারে। এগুলো গোপন রাখুন; কোনো URL ফাঁস হলে নিচে টোকেন পুনরায় তৈরি করুন।",
    },
    panel: {
      facebookLabel: "Facebook Catalog (CSV)",
      googleLabel: "Google Merchant (XML)",
      note: "এই URL গুলোতে একটি গোপন টোকেন আছে। Facebook Commerce Manager ও Google Merchant Center-এ scheduled feed হিসেবে পেস্ট করুন।",
      copy: "কপি",
      copied: "কপি হয়েছে",
      regenerate: "টোকেন পুনরায় তৈরি করুন",
      regenerating: "তৈরি হচ্ছে…",
      confirm:
        "ফিড টোকেন পুনরায় তৈরি করবেন? পুরনো ফিড URL গুলো কাজ করা বন্ধ করবে এবং Facebook / Google Merchant-এ আপনাকে সেগুলো আপডেট করতে হবে।",
    },
  };
}
