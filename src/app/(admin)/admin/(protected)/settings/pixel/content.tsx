// Page-local bilingual copy for the Pixel Manager settings page.
// The in-page language toggle switches between these two dictionaries; it does
// not touch the site-wide NEXT_LOCALE cookie — it only affects this page.

import type { ReactNode } from "react";

export type PixelLang = "en" | "bn";

export interface PixelCopy {
  toggleLabel: string;
  heading: string;
  intro: ReactNode;
  form: {
    pixelHeading: string;
    pixelSubtitle: string;
    active: string;
    disabled: string;
    pixelIdLabel: string;
    pixelIdHelp: string;
    capiHeading: string;
    capiSubtitle: ReactNode;
    activeCapi: string;
    off: string;
    tokenLabel: string;
    tokenSavedPlaceholder: string;
    tokenPlaceholder: string;
    tokenHelp: ReactNode;
    tokenHelpKeep: string;
    testCodeLabel: ReactNode;
    testCodeHelp: ReactNode;
    saved: string;
    save: string;
    saving: string;
  };
  why: {
    heading: string;
    problemTitle: string;
    problemBody: ReactNode;
    fixTitle: string;
    fixBody: ReactNode;
    getTitle: string;
    getItems: string[];
  };
  how: {
    heading: string;
    steps: ReactNode[];
    note: ReactNode;
  };
  about: {
    heading: string;
    whatTitle: string;
    whatBody: ReactNode;
    whyTitle: string;
    whyBody: string;
    benefitsTitle: string;
    benefits: string[];
  };
  where: {
    heading: string;
    subtitle: string;
    steps: { title: string; body: ReactNode }[];
    warning: ReactNode;
  };
}

const codeCls = "rounded bg-stone-100 px-1 py-0.5 font-mono text-[12px]";

export function buildCopy(lang: PixelLang): PixelCopy {
  return lang === "en" ? enCopy() : bnCopy();
}

function enCopy(): PixelCopy {
  return {
    toggleLabel: "বাংলা",
    heading: "Pixel Manager",
    intro: (
      <>
        Connect your Meta (Facebook) Pixel and report <b>phone-confirmed orders</b> back to Facebook, so your
        ads optimize for real customers — not fake orders.
      </>
    ),
    form: {
      pixelHeading: "Pixel ID",
      pixelSubtitle: "Your Meta (Facebook) Pixel.",
      active: "Active",
      disabled: "Disabled",
      pixelIdLabel: "Facebook Pixel ID",
      pixelIdHelp: "Leave blank to disable. Fires PageView and AddToCart from the storefront.",
      capiHeading: "Confirmed-order tracking (Conversions API)",
      capiSubtitle: (
        <>
          Reports a <b>Purchase</b> to Facebook only when you confirm the order by phone.
        </>
      ),
      activeCapi: "Active",
      off: "Off",
      tokenLabel: "Conversions API access token",
      tokenSavedPlaceholder: "•••••••••• (saved — leave blank to keep)",
      tokenPlaceholder: "Paste the System User token from Meta",
      tokenHelp: (
        <>
          A secret — stored encrypted. Generate it in Events Manager → your Pixel →{" "}
          <b>Settings → Conversions API → Generate access token</b>.{" "}
        </>
      ),
      tokenHelpKeep: "Leave blank to keep the current token.",
      testCodeLabel: (
        <>
          Test event code <span className="font-normal text-stone-400">(optional)</span>
        </>
      ),
      testCodeHelp: (
        <>
          While testing, paste the code from the <b>Test Events</b> tab to see confirmed orders arrive live.
          <b> Clear it when you go live</b> so real conversions count.
        </>
      ),
      saved: "Saved.",
      save: "Save",
      saving: "Saving…",
    },
    why: {
      heading: "Why use this?",
      problemTitle: "The problem",
      problemBody: (
        <>
          On a cash-on-delivery store, many orders placed from an ad turn out to be{" "}
          <b className="text-stone-800">fake or prank orders</b>. If Facebook counts every placed order as a
          sale, it learns to find more people who <i>place</i> orders — including the fake ones — and your ad
          money is wasted on shoppers who never actually buy.
        </>
      ),
      fixTitle: "The fix",
      fixBody: (
        <>
          This feature reports a sale to Facebook{" "}
          <b className="text-stone-800">only after you call the customer and they confirm</b> the order is
          real. So Facebook learns from <b className="text-stone-800">genuine, confirmed buyers</b> — not from
          the fake orders.
        </>
      ),
      getTitle: "What you get",
      getItems: [
        "Facebook optimizes ads toward customers who really confirm and buy",
        "Less ad budget wasted on fake or prank COD orders",
        "Lower cost per real, delivered sale over time",
        "Accurate sales data in Ads Manager — matched to the ad that drove each order",
        "Stronger lookalike audiences, built from confirmed buyers only",
      ],
    },
    how: {
      heading: "How confirmed-order tracking works",
      steps: [
        <>
          <b>1.</b> A shopper places an order from your Facebook/Instagram ad. Nothing is reported to Facebook
          as a sale yet.
        </>,
        <>
          <b>2.</b> You (or your team) call the customer to confirm the order is real.
        </>,
        <>
          <b>3.</b> In <b>Orders</b>, change the order&apos;s status to <b>Confirmed</b>.
        </>,
        <>
          <b>4.</b> At that moment the store sends a <b>Purchase</b> event to Facebook — matched to the ad the
          customer clicked.
        </>,
        <>
          <b>5.</b> Facebook learns which people <i>genuinely confirm</i>, and shifts your ad delivery toward
          more shoppers like them.
        </>,
      ],
      note: (
        <>
          For best results, set your ad campaign&apos;s optimization event to <b>Purchase</b> in Meta Ads
          Manager. Both the Pixel ID <i>and</i> the access token above must be set for this to work.
        </>
      ),
    },
    about: {
      heading: "About Facebook Pixel",
      whatTitle: "What is it?",
      whatBody: (
        <>
          The <b className="text-stone-700">Meta (Facebook) Pixel</b> is a small piece of tracking code that
          reports visitor actions on your store — page views, add-to-cart, and purchases — back to your
          Facebook Ads account.
        </>
      ),
      whyTitle: "Why use it?",
      whyBody:
        "It connects your ad spend to real shopper behavior, so Facebook and Instagram can show your ads to the people most likely to buy and measure what each campaign actually earns.",
      benefitsTitle: "What are the benefits?",
      benefits: [
        "Track conversions and real sales from your ads",
        "Retarget visitors who left without buying",
        "Build lookalike audiences of similar shoppers",
        "Optimize delivery toward people likely to purchase",
      ],
    },
    where: {
      heading: "Where to find your Pixel ID",
      subtitle: "In Meta Events Manager",
      steps: [
        {
          title: "Open Events Manager",
          body: (
            <>
              Go to{" "}
              <a
                href="https://business.facebook.com/events_manager2/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-600 underline underline-offset-2"
              >
                Meta Events Manager
              </a>{" "}
              and sign in with your business account.
            </>
          ),
        },
        {
          title: "Connect a data source",
          body: (
            <>
              Click <b>Connect data sources → Web</b>, then create a <b>Pixel</b> and give it a name.
            </>
          ),
        },
        {
          title: "Copy the Pixel ID",
          body: (
            <>
              Select your pixel — the <b>Pixel ID</b> is the long number shown under its name (e.g.{" "}
              <code className={codeCls}>1234567890123456</code>).
            </>
          ),
        },
        {
          title: "Paste & save",
          body: (
            <>
              Enter it in the field on the left and press <b>Save</b>. Tracking starts on the storefront right
              away.
            </>
          ),
        },
      ],
      warning: (
        <>
          The Pixel ID is a <b>numeric</b> value (15–16 digits) — not the pixel name. Copy the number, not the
          label.
        </>
      ),
    },
  };
}

function bnCopy(): PixelCopy {
  return {
    toggleLabel: "English",
    heading: "পিক্সেল ম্যানেজার",
    intro: (
      <>
        আপনার Meta (Facebook) পিক্সেল যুক্ত করুন এবং <b>ফোনে নিশ্চিত হওয়া অর্ডার</b> Facebook-এ রিপোর্ট করুন,
        যাতে আপনার বিজ্ঞাপন আসল গ্রাহকদের জন্য অপটিমাইজ হয় — ভুয়া অর্ডারের জন্য নয়।
      </>
    ),
    form: {
      pixelHeading: "পিক্সেল আইডি",
      pixelSubtitle: "আপনার Meta (Facebook) পিক্সেল।",
      active: "সক্রিয়",
      disabled: "নিষ্ক্রিয়",
      pixelIdLabel: "Facebook পিক্সেল আইডি",
      pixelIdHelp: "নিষ্ক্রিয় করতে খালি রাখুন। স্টোরফ্রন্ট থেকে PageView ও AddToCart ফায়ার করে।",
      capiHeading: "নিশ্চিত-অর্ডার ট্র্যাকিং (Conversions API)",
      capiSubtitle: (
        <>
          আপনি ফোনে অর্ডার নিশ্চিত করলেই কেবল Facebook-এ একটি <b>Purchase</b> রিপোর্ট করে।
        </>
      ),
      activeCapi: "সক্রিয়",
      off: "বন্ধ",
      tokenLabel: "Conversions API অ্যাক্সেস টোকেন",
      tokenSavedPlaceholder: "•••••••••• (সংরক্ষিত — রাখতে খালি রাখুন)",
      tokenPlaceholder: "Meta থেকে System User টোকেন পেস্ট করুন",
      tokenHelp: (
        <>
          একটি সিক্রেট — এনক্রিপ্ট করে সংরক্ষিত। Events Manager → আপনার পিক্সেল →{" "}
          <b>Settings → Conversions API → Generate access token</b> থেকে তৈরি করুন।{" "}
        </>
      ),
      tokenHelpKeep: "বর্তমান টোকেন রাখতে খালি রাখুন।",
      testCodeLabel: (
        <>
          টেস্ট ইভেন্ট কোড <span className="font-normal text-stone-400">(ঐচ্ছিক)</span>
        </>
      ),
      testCodeHelp: (
        <>
          টেস্ট করার সময়, নিশ্চিত অর্ডার লাইভ আসতে দেখতে <b>Test Events</b> ট্যাব থেকে কোডটি পেস্ট করুন।
          <b> লাইভ যাওয়ার সময় এটি মুছে ফেলুন</b> যাতে আসল কনভার্সন গণনা হয়।
        </>
      ),
      saved: "সংরক্ষিত হয়েছে।",
      save: "সংরক্ষণ করুন",
      saving: "সংরক্ষণ হচ্ছে…",
    },
    why: {
      heading: "কেন এটি ব্যবহার করবেন?",
      problemTitle: "সমস্যাটি",
      problemBody: (
        <>
          ক্যাশ অন ডেলিভারি স্টোরে, বিজ্ঞাপন থেকে দেওয়া অনেক অর্ডার আসলে{" "}
          <b className="text-stone-800">ভুয়া বা মজার অর্ডার</b> হয়। Facebook যদি প্রতিটি দেওয়া অর্ডারকে বিক্রি
          হিসেবে গণনা করে, তাহলে এটি আরও বেশি এমন মানুষ খুঁজতে শেখে যারা অর্ডার <i>দেয়</i> — ভুয়াগুলোসহ — আর
          আপনার বিজ্ঞাপনের টাকা এমন ক্রেতাদের পেছনে নষ্ট হয় যারা আসলে কখনো কেনে না।
        </>
      ),
      fixTitle: "সমাধান",
      fixBody: (
        <>
          এই ফিচারটি Facebook-এ বিক্রি রিপোর্ট করে{" "}
          <b className="text-stone-800">শুধু আপনি গ্রাহককে ফোন করে তারা নিশ্চিত করার পরই</b> যে অর্ডারটি আসল।
          ফলে Facebook <b className="text-stone-800">প্রকৃত, নিশ্চিত ক্রেতাদের</b> থেকে শেখে — ভুয়া অর্ডার থেকে
          নয়।
        </>
      ),
      getTitle: "আপনি যা পাবেন",
      getItems: [
        "Facebook যারা সত্যিই নিশ্চিত করে ও কেনে তাদের দিকে বিজ্ঞাপন অপটিমাইজ করে",
        "ভুয়া বা মজার COD অর্ডারে কম বিজ্ঞাপন বাজেট নষ্ট",
        "সময়ের সাথে প্রতি আসল, ডেলিভার হওয়া বিক্রিতে কম খরচ",
        "Ads Manager-এ নির্ভুল বিক্রির ডেটা — প্রতিটি অর্ডার যে বিজ্ঞাপন এনেছে তার সাথে মিলিয়ে",
        "শুধু নিশ্চিত ক্রেতাদের থেকে তৈরি শক্তিশালী লুকঅ্যালাইক অডিয়েন্স",
      ],
    },
    how: {
      heading: "নিশ্চিত-অর্ডার ট্র্যাকিং কীভাবে কাজ করে",
      steps: [
        <>
          <b>১.</b> একজন ক্রেতা আপনার Facebook/Instagram বিজ্ঞাপন থেকে একটি অর্ডার দেন। এখনো Facebook-এ বিক্রি
          হিসেবে কিছু রিপোর্ট করা হয় না।
        </>,
        <>
          <b>২.</b> আপনি (বা আপনার টিম) গ্রাহককে ফোন করে অর্ডারটি আসল কিনা নিশ্চিত করেন।
        </>,
        <>
          <b>৩.</b> <b>Orders</b>-এ গিয়ে অর্ডারের স্ট্যাটাস <b>Confirmed</b> করুন।
        </>,
        <>
          <b>৪.</b> সেই মুহূর্তে স্টোর Facebook-এ একটি <b>Purchase</b> ইভেন্ট পাঠায় — গ্রাহক যে বিজ্ঞাপনে ক্লিক
          করেছিলেন তার সাথে মিলিয়ে।
        </>,
        <>
          <b>৫.</b> Facebook শেখে কারা <i>সত্যিকারে নিশ্চিত করে</i>, এবং আপনার বিজ্ঞাপন ডেলিভারি তাদের মতো আরও
          ক্রেতার দিকে সরিয়ে নেয়।
        </>,
      ],
      note: (
        <>
          সেরা ফলাফলের জন্য, Meta Ads Manager-এ আপনার বিজ্ঞাপন ক্যাম্পেইনের অপটিমাইজেশন ইভেন্ট <b>Purchase</b>{" "}
          সেট করুন। এটি কাজ করতে উপরের পিক্সেল আইডি <i>এবং</i> অ্যাক্সেস টোকেন — দুটোই সেট থাকতে হবে।
        </>
      ),
    },
    about: {
      heading: "Facebook পিক্সেল সম্পর্কে",
      whatTitle: "এটি কী?",
      whatBody: (
        <>
          <b className="text-stone-700">Meta (Facebook) পিক্সেল</b> হলো ট্র্যাকিং কোডের একটি ছোট অংশ, যা আপনার
          স্টোরে ভিজিটরদের কার্যকলাপ — পেজ ভিউ, অ্যাড-টু-কার্ট ও ক্রয় — আপনার Facebook Ads অ্যাকাউন্টে রিপোর্ট
          করে।
        </>
      ),
      whyTitle: "কেন ব্যবহার করবেন?",
      whyBody:
        "এটি আপনার বিজ্ঞাপন ব্যয়কে প্রকৃত ক্রেতার আচরণের সাথে যুক্ত করে, ফলে Facebook ও Instagram আপনার বিজ্ঞাপন সবচেয়ে সম্ভাব্য ক্রেতাদের দেখাতে পারে এবং প্রতিটি ক্যাম্পেইন আসলে কত আয় করে তা পরিমাপ করতে পারে।",
      benefitsTitle: "সুবিধাগুলো কী?",
      benefits: [
        "আপনার বিজ্ঞাপন থেকে কনভার্সন ও আসল বিক্রি ট্র্যাক করুন",
        "যারা না কিনে চলে গেছে তাদের রিটার্গেট করুন",
        "একই ধরনের ক্রেতাদের লুকঅ্যালাইক অডিয়েন্স তৈরি করুন",
        "সম্ভাব্য ক্রেতাদের দিকে ডেলিভারি অপটিমাইজ করুন",
      ],
    },
    where: {
      heading: "আপনার পিক্সেল আইডি কোথায় পাবেন",
      subtitle: "Meta Events Manager-এ",
      steps: [
        {
          title: "Events Manager খুলুন",
          body: (
            <>
              <a
                href="https://business.facebook.com/events_manager2/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-600 underline underline-offset-2"
              >
                Meta Events Manager
              </a>{" "}
              এ যান এবং আপনার বিজনেস অ্যাকাউন্ট দিয়ে সাইন ইন করুন।
            </>
          ),
        },
        {
          title: "একটি ডেটা সোর্স যুক্ত করুন",
          body: (
            <>
              <b>Connect data sources → Web</b> ক্লিক করুন, তারপর একটি <b>Pixel</b> তৈরি করে একটি নাম দিন।
            </>
          ),
        },
        {
          title: "পিক্সেল আইডি কপি করুন",
          body: (
            <>
              আপনার পিক্সেল নির্বাচন করুন — <b>Pixel ID</b> হলো এর নামের নিচে দেখানো লম্বা সংখ্যাটি (যেমন{" "}
              <code className={codeCls}>1234567890123456</code>)।
            </>
          ),
        },
        {
          title: "পেস্ট করে সংরক্ষণ করুন",
          body: (
            <>
              বাঁপাশের ঘরে এটি লিখে <b>Save</b> চাপুন। স্টোরফ্রন্টে সঙ্গে সঙ্গে ট্র্যাকিং শুরু হয়।
            </>
          ),
        },
      ],
      warning: (
        <>
          পিক্সেল আইডি একটি <b>সংখ্যাসূচক</b> মান (১৫–১৬ ডিজিট) — পিক্সেলের নাম নয়। লেবেল নয়, সংখ্যাটি কপি করুন।
        </>
      ),
    },
  };
}
