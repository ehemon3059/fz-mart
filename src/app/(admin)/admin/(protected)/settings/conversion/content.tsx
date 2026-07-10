// Page-local bilingual copy for the Conversion & Anti-Fraud settings page.
// The in-page language toggle switches between these two dictionaries; it does
// not touch the site-wide NEXT_LOCALE cookie — it only affects this page.

import type { ReactNode } from "react";

export type ConversionLang = "en" | "bn";

export interface ConversionCopy {
  toggleLabel: string;
  heading: string;
  intro: string;
  explainer: {
    heading: string;
    body: ReactNode;
    applyTitle: string;
    applyItems: ReactNode[];
    whyTitle: string;
    whyItems: ReactNode[];
    whereTitle: string;
    whereItems: ReactNode[];
  };
  form: {
    otpHeading: string;
    otpLabel: string;
    otpHelp: string;
    returnsHeading: string;
    returnWindowLabel: string;
    returnWindowHelp: string;
    cartHeading: string;
    cartToggleLabel: string;
    cartToggleHelp: string;
    cartDelayLabel: string;
    cartMessageLabel: string;
    cartMessageHelp: ReactNode;
    saved: string;
    save: string;
    saving: string;
  };
}

export function buildCopy(lang: ConversionLang): ConversionCopy {
  return lang === "en" ? enCopy() : bnCopy();
}

function enCopy(): ConversionCopy {
  return {
    toggleLabel: "বাংলা",
    heading: "Conversion & Anti-Fraud",
    intro: "Phone OTP, returns, and abandoned-cart recovery. (Chat buttons live under Appearance.)",
    explainer: {
      heading: "What is Conversion & Anti-Fraud?",
      body: (
        <>
          A set of tools that do two jobs at once for a cash-on-delivery shop:
          <span className="font-semibold text-stone-800"> win back sales</span> that would otherwise be
          lost, and <span className="font-semibold text-stone-800">cut fake / junk COD orders</span> that
          waste courier fees on failed deliveries. It covers phone OTP, abandoned-cart recovery,
          self-service returns, coupons, wishlist and back-in-stock alerts, and chat buttons.
        </>
      ),
      applyTitle: "How to apply",
      applyItems: [
        <>
          Turn on <b>Phone OTP</b> so COD buyers verify their number by SMS before the order is accepted
          (repeat delivered buyers are skipped).
        </>,
        <>
          Enable <b>abandoned-cart recovery</b> and set the delay + message to nudge buyers who left
          checkout.
        </>,
        <>
          Set a <b>return window</b> so customers can self-request returns from their order page. Coupons
          live under Coupons; returns are approved under Returns.
        </>,
      ],
      whyTitle: "Why use it",
      whyItems: [
        <>
          <b>Fewer fake COD orders</b> — OTP lowers failed-delivery and courier round-trip costs.
        </>,
        <>
          <b>More recovered revenue</b> — carts, wishlists and back-in-stock alerts turn drop-offs into
          purchases.
        </>,
        <>
          <b>Higher trust &amp; repeat rate</b> — easy returns and instant chat reduce buyer hesitation.
        </>,
      ],
      whereTitle: "Where it lives",
      whereItems: [
        <>Phone OTP, returns &amp; abandoned cart — this page.</>,
        <>Coupons — under Coupons.</>,
        <>Returns queue — under Returns.</>,
        <>WhatsApp / Messenger chat buttons — under Appearance.</>,
      ],
    },
    form: {
      otpHeading: "Phone OTP at COD checkout",
      otpLabel: "Require phone verification for COD",
      otpHelp:
        "New customers get an SMS code before a Cash-on-Delivery order is placed. Repeat (delivered) buyers skip it. Requires a configured SMS gateway.",
      returnsHeading: "Returns",
      returnWindowLabel: "Return window (days)",
      returnWindowHelp: "Customers can request a return within this many days of delivery.",
      cartHeading: "Abandoned-cart recovery",
      cartToggleLabel: "Send recovery reminders",
      cartToggleHelp: "For signed-in customers who reach checkout but don't finish.",
      cartDelayLabel: "Delay before reminder (hours)",
      cartMessageLabel: "Reminder message (SMS)",
      cartMessageHelp: (
        <>
          Use <code className="rounded bg-stone-100 px-1">{"{link}"}</code> for the restore-cart link.
        </>
      ),
      saved: "Saved.",
      save: "Save",
      saving: "Saving…",
    },
  };
}

function bnCopy(): ConversionCopy {
  return {
    toggleLabel: "English",
    heading: "কনভার্সন ও অ্যান্টি-ফ্রড",
    intro: "ফোন OTP, রিটার্ন, এবং পরিত্যক্ত-কার্ট রিকভারি। (চ্যাট বোতাম Appearance-এর অধীনে আছে।)",
    explainer: {
      heading: "কনভার্সন ও অ্যান্টি-ফ্রড কী?",
      body: (
        <>
          ক্যাশ অন ডেলিভারি দোকানের জন্য এমন কিছু টুল যা একসাথে দুটি কাজ করে:
          <span className="font-semibold text-stone-800"> হারিয়ে যাওয়া বিক্রি ফিরিয়ে আনে</span> যেগুলো
          অন্যথায় হারাত, এবং{" "}
          <span className="font-semibold text-stone-800">ভুয়া / বাজে COD অর্ডার কমায়</span> যা ব্যর্থ
          ডেলিভারিতে কুরিয়ার ফি নষ্ট করে। এতে আছে ফোন OTP, পরিত্যক্ত-কার্ট রিকভারি, সেলফ-সার্ভিস রিটার্ন,
          কুপন, উইশলিস্ট ও ব্যাক-ইন-স্টক অ্যালার্ট, এবং চ্যাট বোতাম।
        </>
      ),
      applyTitle: "কীভাবে প্রয়োগ করবেন",
      applyItems: [
        <>
          <b>ফোন OTP</b> চালু করুন যাতে COD ক্রেতারা অর্ডার গৃহীত হওয়ার আগে SMS-এ তাদের নম্বর যাচাই করে
          (আগে ডেলিভার নেওয়া ক্রেতাদের বাদ দেওয়া হয়)।
        </>,
        <>
          <b>পরিত্যক্ত-কার্ট রিকভারি</b> চালু করুন এবং চেকআউট ছেড়ে যাওয়া ক্রেতাদের মনে করিয়ে দিতে বিলম্ব ও
          বার্তা সেট করুন।
        </>,
        <>
          একটি <b>রিটার্ন উইন্ডো</b> সেট করুন যাতে গ্রাহকরা তাদের অর্ডার পেজ থেকে নিজে রিটার্নের অনুরোধ করতে
          পারে। কুপন Coupons-এ; রিটার্ন Returns-এ অনুমোদন হয়।
        </>,
      ],
      whyTitle: "কেন ব্যবহার করবেন",
      whyItems: [
        <>
          <b>কম ভুয়া COD অর্ডার</b> — OTP ব্যর্থ-ডেলিভারি ও কুরিয়ার রাউন্ড-ট্রিপ খরচ কমায়।
        </>,
        <>
          <b>বেশি রিকভার করা আয়</b> — কার্ট, উইশলিস্ট ও ব্যাক-ইন-স্টক অ্যালার্ট ড্রপ-অফকে ক্রয়ে রূপান্তর করে।
        </>,
        <>
          <b>বেশি আস্থা ও পুনরায় কেনার হার</b> — সহজ রিটার্ন ও তাৎক্ষণিক চ্যাট ক্রেতার দ্বিধা কমায়।
        </>,
      ],
      whereTitle: "কোথায় আছে",
      whereItems: [
        <>ফোন OTP, রিটার্ন ও পরিত্যক্ত কার্ট — এই পেজে।</>,
        <>কুপন — Coupons-এর অধীনে।</>,
        <>রিটার্ন কিউ — Returns-এর অধীনে।</>,
        <>WhatsApp / Messenger চ্যাট বোতাম — Appearance-এর অধীনে।</>,
      ],
    },
    form: {
      otpHeading: "COD চেকআউটে ফোন OTP",
      otpLabel: "COD-এর জন্য ফোন যাচাইকরণ আবশ্যক করুন",
      otpHelp:
        "নতুন গ্রাহকরা ক্যাশ-অন-ডেলিভারি অর্ডার দেওয়ার আগে একটি SMS কোড পান। আগে ডেলিভার নেওয়া ক্রেতারা এটি বাদ দেয়। একটি কনফিগার করা SMS গেটওয়ে প্রয়োজন।",
      returnsHeading: "রিটার্ন",
      returnWindowLabel: "রিটার্ন উইন্ডো (দিন)",
      returnWindowHelp: "গ্রাহকরা ডেলিভারির এত দিনের মধ্যে রিটার্নের অনুরোধ করতে পারে।",
      cartHeading: "পরিত্যক্ত-কার্ট রিকভারি",
      cartToggleLabel: "রিকভারি রিমাইন্ডার পাঠান",
      cartToggleHelp: "যেসব সাইন-ইন করা গ্রাহক চেকআউটে পৌঁছায় কিন্তু শেষ করে না তাদের জন্য।",
      cartDelayLabel: "রিমাইন্ডারের আগে বিলম্ব (ঘণ্টা)",
      cartMessageLabel: "রিমাইন্ডার বার্তা (SMS)",
      cartMessageHelp: (
        <>
          কার্ট পুনরুদ্ধারের লিঙ্কের জন্য <code className="rounded bg-stone-100 px-1">{"{link}"}</code>{" "}
          ব্যবহার করুন।
        </>
      ),
      saved: "সংরক্ষিত হয়েছে।",
      save: "সংরক্ষণ করুন",
      saving: "সংরক্ষণ হচ্ছে…",
    },
  };
}
