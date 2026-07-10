// Page-local bilingual copy for the Payments settings page.
// The in-page language toggle switches between these two dictionaries; it does
// not touch the site-wide NEXT_LOCALE cookie — it only affects this page.

import type { ReactNode } from "react";

export type PaymentsLang = "en" | "bn";

export interface PaymentsCopy {
  toggleLabel: string;
  heading: string;
  statusOn: string;
  statusOff: string;
  siteUrlWarning: ReactNode; // contains the inline Site URL link + <code>localhost</code>
  /** Heading + body for the loud "you're on test/sandbox" banner. */
  sandboxWarning: { title: string; body: string };
  gatewayIntro: {
    heading: string;
    body: string;
    ssl: {
      title: string;
      body: string;
      howTo: string;
      steps: ReactNode[];
    };
    bkash: {
      title: string;
      body: string;
      howTo: string;
      steps: ReactNode[];
    };
  };
  form: {
    onlineHeading: string;
    onlineToggle: string;
    onlineHint: string;
    partialToggle: string;
    partialHint: string;
    sslHeading: string;
    sslSubtitle: string;
    sslEnable: string;
    sandbox: string;
    sslSandboxHint: string;
    storeId: string;
    storePassword: string;
    keepPlaceholder: string;
    storePasswordPlaceholder: string;
    feePct: string;
    sslFeeHint: string;
    bkashHeading: string;
    bkashSubtitle: string;
    bkashEnable: string;
    appKey: string;
    appSecret: string;
    appSecretPlaceholder: string;
    username: string;
    password: string;
    passwordPlaceholder: string;
    mockToggle: string;
    mockHint: string;
    saved: string;
    save: string;
    saving: string;
  };
}

export function buildCopy(lang: PaymentsLang, siteUrlLink: ReactNode): PaymentsCopy {
  return lang === "en" ? enCopy(siteUrlLink) : bnCopy(siteUrlLink);
}

function enCopy(siteUrlLink: ReactNode): PaymentsCopy {
  return {
    toggleLabel: "বাংলা",
    heading: "Payments",
    statusOn: "Online payment is live at checkout.",
    statusOff: "Online payment is off — checkout is COD only.",
    sandboxWarning: {
      title: "SANDBOX / TEST MODE",
      body: "One or more active payment methods are in test mode — no real money will move. Turn OFF “Use test/sandbox mode” for each live gateway (and disable the Test Gateway) before accepting real orders.",
    },
    siteUrlWarning: (
      <>
        Gateways redirect customers back to your {siteUrlLink}, so set your live domain there before going
        live. It must be a public HTTPS address — bKash and SSLCommerz can&apos;t reach <code>localhost</code>.
      </>
    ),
    gatewayIntro: {
      heading: "Which gateway should I use?",
      body: "Both let customers pay online. Set up one or both — whichever you have a merchant account for. Fill its fields below and turn it on.",
      ssl: {
        title: "SSLCommerz",
        body: "A Bangladeshi payment aggregator. One integration gives your customers every popular method at once — cards (Visa/Mastercard), bKash, Nagad, Rocket and bank wallets — through a single hosted checkout page. Easiest way to accept everything without signing up with each provider separately.",
        howTo: "How to connect",
        steps: [
          <>
            Open a merchant account at{" "}
            <a
              href="https://sslcommerz.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand-600 underline underline-offset-2"
            >
              sslcommerz.com
            </a>{" "}
            and get your <strong>Store ID</strong> and <strong>Store Password</strong>.
          </>,
          <>
            Enter them in the <strong>SSLCommerz</strong> section below.
          </>,
          <>
            Keep <strong>Sandbox mode</strong> on to test; turn it off with live credentials to take real
            money.
          </>,
          <>
            Tick <strong>Enable SSLCommerz</strong> and <strong>Enable online payment</strong> at the top,
            then Save.
          </>,
        ],
      },
      bkash: {
        title: "bKash (PGW)",
        body: "A direct bKash-only integration (their Payment Gateway / Tokenized Checkout). Customers pay inside the familiar bKash flow — no card, no other wallet. Use this if you want a dedicated bKash button and have a bKash Merchant account. Lower fees than going through an aggregator, but it only accepts bKash.",
        howTo: "How to connect",
        steps: [
          <>
            Apply for bKash <strong>Merchant PGW / Tokenized Checkout</strong> and receive your{" "}
            <strong>App Key</strong>, <strong>App Secret</strong>, <strong>Username</strong> and{" "}
            <strong>Password</strong>.
          </>,
          <>
            Enter all four in the <strong>bKash (PGW)</strong> section below.
          </>,
          <>
            Keep <strong>Sandbox mode</strong> on to test with bKash&apos;s test environment; turn it off with
            live credentials for real payments.
          </>,
          <>
            Tick <strong>Enable bKash</strong> and <strong>Enable online payment</strong> at the top, then
            Save.
          </>,
        ],
      },
    },
    form: {
      onlineHeading: "Online payments",
      onlineToggle: "Enable online payment at checkout",
      onlineHint:
        "When off, customers only see Cash on Delivery — regardless of provider settings below.",
      partialToggle: "Allow partial advance (pay delivery charge online, rest COD)",
      partialHint:
        "The standard BD anti-fake-order option: the customer commits the delivery fee up front.",
      sslHeading: "SSLCommerz",
      sslSubtitle: "Hosted checkout — one integration covers cards, bKash, Nagad, Rocket and bank wallets.",
      sslEnable: "Enable SSLCommerz",
      sandbox: "Sandbox mode",
      sslSandboxHint: "Use the SSLCommerz sandbox until your store account goes live.",
      storeId: "Store ID",
      storePassword: "Store Password",
      keepPlaceholder: "Leave blank to keep current",
      storePasswordPlaceholder: "Store password",
      feePct: "Gateway fee (%)",
      sslFeeHint: "Recorded automatically as this order's gateway cost in the P&L when a payment succeeds.",
      bkashHeading: "bKash (PGW)",
      bkashSubtitle: "Direct bKash tokenized checkout — customers pay inside the bKash flow.",
      bkashEnable: "Enable bKash",
      appKey: "App Key",
      appSecret: "App Secret",
      appSecretPlaceholder: "App secret",
      username: "Username",
      password: "Password",
      passwordPlaceholder: "Password",
      mockToggle: "Enable test gateway (mock provider)",
      mockHint:
        "Development and automated tests only — shows a fake 'Pay' page. Never enable on a live store.",
      saved: "Saved.",
      save: "Save",
      saving: "Saving...",
    },
  };
}

function bnCopy(siteUrlLink: ReactNode): PaymentsCopy {
  return {
    toggleLabel: "English",
    heading: "পেমেন্ট",
    statusOn: "চেকআউটে অনলাইন পেমেন্ট চালু আছে।",
    statusOff: "অনলাইন পেমেন্ট বন্ধ — চেকআউট শুধু ক্যাশ অন ডেলিভারি।",
    sandboxWarning: {
      title: "স্যান্ডবক্স / টেস্ট মোড",
      body: "চালু থাকা এক বা একাধিক পেমেন্ট পদ্ধতি টেস্ট মোডে আছে — আসল টাকা লেনদেন হবে না। আসল অর্ডার নেওয়ার আগে প্রতিটি লাইভ গেটওয়ের “টেস্ট/স্যান্ডবক্স মোড” বন্ধ করুন (এবং টেস্ট গেটওয়ে নিষ্ক্রিয় করুন)।",
    },
    siteUrlWarning: (
      <>
        গেটওয়ে গ্রাহকদের আপনার {siteUrlLink}-এ ফিরিয়ে আনে, তাই লাইভ যাওয়ার আগে সেখানে আপনার লাইভ ডোমেইন সেট
        করুন। এটি অবশ্যই একটি পাবলিক HTTPS ঠিকানা হতে হবে — bKash ও SSLCommerz <code>localhost</code>-এ পৌঁছাতে
        পারে না।
      </>
    ),
    gatewayIntro: {
      heading: "আমি কোন গেটওয়ে ব্যবহার করব?",
      body: "দুটোই গ্রাহকদের অনলাইনে পেমেন্ট করতে দেয়। যেটির মার্চেন্ট অ্যাকাউন্ট আছে সেটি — বা দুটোই — সেট আপ করুন। নিচে এর ঘরগুলো পূরণ করে চালু করুন।",
      ssl: {
        title: "SSLCommerz",
        body: "একটি বাংলাদেশি পেমেন্ট অ্যাগ্রিগেটর। একটি ইন্টিগ্রেশনেই আপনার গ্রাহকরা একসাথে সব জনপ্রিয় মাধ্যম পায় — কার্ড (Visa/Mastercard), bKash, Nagad, Rocket ও ব্যাংক ওয়ালেট — একটি হোস্টেড চেকআউট পেজের মাধ্যমে। প্রতিটি প্রোভাইডারে আলাদা সাইন আপ না করে সবকিছু গ্রহণ করার সবচেয়ে সহজ উপায়।",
        howTo: "কীভাবে যুক্ত করবেন",
        steps: [
          <>
            {" "}
            <a
              href="https://sslcommerz.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand-600 underline underline-offset-2"
            >
              sslcommerz.com
            </a>{" "}
            -এ একটি মার্চেন্ট অ্যাকাউন্ট খুলুন এবং আপনার <strong>Store ID</strong> ও{" "}
            <strong>Store Password</strong> সংগ্রহ করুন।
          </>,
          <>
            নিচের <strong>SSLCommerz</strong> সেকশনে সেগুলো দিন।
          </>,
          <>
            টেস্ট করতে <strong>Sandbox mode</strong> চালু রাখুন; আসল টাকা নিতে লাইভ ক্রেডেনশিয়াল দিয়ে এটি বন্ধ
            করুন।
          </>,
          <>
            উপরে <strong>Enable SSLCommerz</strong> ও <strong>Enable online payment</strong> টিক দিন, তারপর
            Save করুন।
          </>,
        ],
      },
      bkash: {
        title: "bKash (PGW)",
        body: "একটি সরাসরি শুধু-bKash ইন্টিগ্রেশন (তাদের Payment Gateway / Tokenized Checkout)। গ্রাহকরা পরিচিত bKash ফ্লোর ভেতরেই পেমেন্ট করে — কোনো কার্ড নয়, অন্য কোনো ওয়ালেট নয়। আপনি যদি একটি নির্দিষ্ট bKash বোতাম চান এবং একটি bKash Merchant অ্যাকাউন্ট থাকে তবে এটি ব্যবহার করুন। অ্যাগ্রিগেটরের চেয়ে কম ফি, তবে এটি শুধু bKash গ্রহণ করে।",
        howTo: "কীভাবে যুক্ত করবেন",
        steps: [
          <>
            bKash <strong>Merchant PGW / Tokenized Checkout</strong>-এর জন্য আবেদন করুন এবং আপনার{" "}
            <strong>App Key</strong>, <strong>App Secret</strong>, <strong>Username</strong> ও{" "}
            <strong>Password</strong> সংগ্রহ করুন।
          </>,
          <>
            নিচের <strong>bKash (PGW)</strong> সেকশনে চারটিই দিন।
          </>,
          <>
            bKash-এর টেস্ট পরিবেশে যাচাই করতে <strong>Sandbox mode</strong> চালু রাখুন; আসল পেমেন্টের জন্য লাইভ
            ক্রেডেনশিয়াল দিয়ে এটি বন্ধ করুন।
          </>,
          <>
            উপরে <strong>Enable bKash</strong> ও <strong>Enable online payment</strong> টিক দিন, তারপর Save
            করুন।
          </>,
        ],
      },
    },
    form: {
      onlineHeading: "অনলাইন পেমেন্ট",
      onlineToggle: "চেকআউটে অনলাইন পেমেন্ট চালু করুন",
      onlineHint:
        "বন্ধ থাকলে, নিচের প্রোভাইডার সেটিং যাই হোক, গ্রাহকরা শুধু ক্যাশ অন ডেলিভারি দেখবে।",
      partialToggle: "আংশিক অগ্রিম অনুমোদন করুন (ডেলিভারি চার্জ অনলাইনে, বাকিটা COD)",
      partialHint:
        "বাংলাদেশের প্রমিত অ্যান্টি-ফেক-অর্ডার অপশন: গ্রাহক আগেই ডেলিভারি ফি পরিশোধ করে প্রতিশ্রুতি দেয়।",
      sslHeading: "SSLCommerz",
      sslSubtitle: "হোস্টেড চেকআউট — একটি ইন্টিগ্রেশনে কার্ড, bKash, Nagad, Rocket ও ব্যাংক ওয়ালেট কভার হয়।",
      sslEnable: "SSLCommerz চালু করুন",
      sandbox: "স্যান্ডবক্স মোড",
      sslSandboxHint: "আপনার স্টোর অ্যাকাউন্ট লাইভ না হওয়া পর্যন্ত SSLCommerz স্যান্ডবক্স ব্যবহার করুন।",
      storeId: "Store ID",
      storePassword: "Store Password",
      keepPlaceholder: "বর্তমানটি রাখতে খালি রাখুন",
      storePasswordPlaceholder: "Store password",
      feePct: "গেটওয়ে ফি (%)",
      sslFeeHint: "পেমেন্ট সফল হলে এটি স্বয়ংক্রিয়ভাবে এই অর্ডারের গেটওয়ে খরচ হিসেবে P&L-এ রেকর্ড হয়।",
      bkashHeading: "bKash (PGW)",
      bkashSubtitle: "সরাসরি bKash টোকেনাইজড চেকআউট — গ্রাহকরা bKash ফ্লোর ভেতরেই পেমেন্ট করে।",
      bkashEnable: "bKash চালু করুন",
      appKey: "App Key",
      appSecret: "App Secret",
      appSecretPlaceholder: "App secret",
      username: "Username",
      password: "Password",
      passwordPlaceholder: "Password",
      mockToggle: "টেস্ট গেটওয়ে চালু করুন (মক প্রোভাইডার)",
      mockHint:
        "শুধু ডেভেলপমেন্ট ও স্বয়ংক্রিয় টেস্টের জন্য — একটি নকল 'Pay' পেজ দেখায়। লাইভ স্টোরে কখনো চালু করবেন না।",
      saved: "সংরক্ষিত হয়েছে।",
      save: "সংরক্ষণ করুন",
      saving: "সংরক্ষণ হচ্ছে...",
    },
  };
}
