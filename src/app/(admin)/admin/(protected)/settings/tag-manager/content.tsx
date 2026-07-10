// Page-local bilingual copy for the Tag Manager settings page.
// The in-page language toggle switches between these two dictionaries; it does
// not touch the site-wide NEXT_LOCALE cookie — it only affects this page.

import type { ReactNode } from "react";

export type TagManagerLang = "en" | "bn";

export interface TagManagerCopy {
  toggleLabel: string;
  heading: string;
  intro: string;
  form: {
    containerHeading: string;
    containerSubtitle: string;
    active: string;
    disabled: string;
    gtmIdLabel: string;
    gtmIdHelp: string;
    saved: string;
    save: string;
    saving: string;
  };
  whatIs: {
    heading: string;
    body1: ReactNode;
    body2: ReactNode;
  };
  guide: {
    heading: string;
    subtitle: string;
    steps: { title: string; body: ReactNode }[];
    warning: ReactNode;
  };
}

const codeCls = "rounded bg-stone-100 px-1 py-0.5 font-mono text-[12px]";

export function buildCopy(lang: TagManagerLang): TagManagerCopy {
  return lang === "en" ? enCopy() : bnCopy();
}

function enCopy(): TagManagerCopy {
  return {
    toggleLabel: "বাংলা",
    heading: "Tag Manager",
    intro:
      "Load Google Tag Manager on your storefront so you can manage analytics and marketing tags without touching code.",
    form: {
      containerHeading: "Container ID",
      containerSubtitle: "Your Google Tag Manager container.",
      active: "Active",
      disabled: "Disabled",
      gtmIdLabel: "Google Tag Manager ID",
      gtmIdHelp: "Leave blank to disable — no script is injected when empty.",
      saved: "Saved.",
      save: "Save",
      saving: "Saving…",
    },
    whatIs: {
      heading: "What is Tag Manager?",
      body1: (
        <>
          <b className="text-stone-700">Google Tag Manager (GTM)</b> is a free tool that lets you add and
          update tracking tags — Google Analytics, Meta Pixel, conversion tracking, and more — without editing
          your store&apos;s code. You manage everything from one dashboard, and changes go live instantly.
        </>
      ),
      body2: (
        <>
          Paste your <b>Container ID</b> here and the store loads the GTM snippet on every page. From then on
          you configure individual tags inside GTM itself.
        </>
      ),
    },
    guide: {
      heading: "How to set up",
      subtitle: "Get your GTM container ID",
      steps: [
        {
          title: "Open Tag Manager",
          body: (
            <>
              Go to{" "}
              <a
                href="https://tagmanager.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-600 underline underline-offset-2"
              >
                tagmanager.google.com
              </a>{" "}
              and sign in with your Google account.
            </>
          ),
        },
        {
          title: "Create a container",
          body: (
            <>
              Click <b>Create Account</b>, enter your store name, and choose <b>Web</b> as the target platform.
            </>
          ),
        },
        {
          title: "Copy the Container ID",
          body: (
            <>
              Your ID appears at the top, formatted like <code className={codeCls}>GTM-XXXXXXX</code>.
            </>
          ),
        },
        {
          title: "Paste & save",
          body: (
            <>
              Enter it in the field on the left and press <b>Save</b>. The snippet loads on every storefront
              page automatically.
            </>
          ),
        },
      ],
      warning: (
        <>
          Don&apos;t confuse this with a Measurement ID (<code>G-XXXXXXX</code>). Tag Manager IDs always start
          with <code>GTM-</code>.
        </>
      ),
    },
  };
}

function bnCopy(): TagManagerCopy {
  return {
    toggleLabel: "English",
    heading: "ট্যাগ ম্যানেজার",
    intro:
      "আপনার স্টোরফ্রন্টে Google Tag Manager লোড করুন, যাতে কোড না ছুঁয়েই অ্যানালিটিক্স ও মার্কেটিং ট্যাগ পরিচালনা করতে পারেন।",
    form: {
      containerHeading: "কন্টেইনার আইডি",
      containerSubtitle: "আপনার Google Tag Manager কন্টেইনার।",
      active: "সক্রিয়",
      disabled: "নিষ্ক্রিয়",
      gtmIdLabel: "Google Tag Manager আইডি",
      gtmIdHelp: "নিষ্ক্রিয় করতে খালি রাখুন — খালি থাকলে কোনো স্ক্রিপ্ট যুক্ত হয় না।",
      saved: "সংরক্ষিত হয়েছে।",
      save: "সংরক্ষণ করুন",
      saving: "সংরক্ষণ হচ্ছে…",
    },
    whatIs: {
      heading: "ট্যাগ ম্যানেজার কী?",
      body1: (
        <>
          <b className="text-stone-700">Google Tag Manager (GTM)</b> একটি ফ্রি টুল, যা আপনার স্টোরের কোড সম্পাদনা
          না করেই ট্র্যাকিং ট্যাগ — Google Analytics, Meta Pixel, কনভার্সন ট্র্যাকিং ও আরও — যোগ ও আপডেট করতে
          দেয়। আপনি একটি ড্যাশবোর্ড থেকে সবকিছু পরিচালনা করেন, এবং পরিবর্তন সঙ্গে সঙ্গে লাইভ হয়।
        </>
      ),
      body2: (
        <>
          এখানে আপনার <b>কন্টেইনার আইডি</b> পেস্ট করুন, স্টোর প্রতিটি পেজে GTM স্নিপেট লোড করবে। এরপর থেকে আপনি
          পৃথক ট্যাগগুলো GTM-এর ভেতরেই কনফিগার করবেন।
        </>
      ),
    },
    guide: {
      heading: "কীভাবে সেটআপ করবেন",
      subtitle: "আপনার GTM কন্টেইনার আইডি সংগ্রহ করুন",
      steps: [
        {
          title: "Tag Manager খুলুন",
          body: (
            <>
              <a
                href="https://tagmanager.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-600 underline underline-offset-2"
              >
                tagmanager.google.com
              </a>{" "}
              এ যান এবং আপনার Google অ্যাকাউন্ট দিয়ে সাইন ইন করুন।
            </>
          ),
        },
        {
          title: "একটি কন্টেইনার তৈরি করুন",
          body: (
            <>
              <b>Create Account</b> ক্লিক করুন, আপনার স্টোরের নাম দিন, এবং টার্গেট প্ল্যাটফর্ম হিসেবে <b>Web</b>{" "}
              বেছে নিন।
            </>
          ),
        },
        {
          title: "কন্টেইনার আইডি কপি করুন",
          body: (
            <>
              আপনার আইডি উপরে দেখা যাবে, <code className={codeCls}>GTM-XXXXXXX</code> ফরম্যাটে।
            </>
          ),
        },
        {
          title: "পেস্ট করে সংরক্ষণ করুন",
          body: (
            <>
              বাঁপাশের ঘরে এটি লিখে <b>Save</b> চাপুন। স্নিপেটটি স্বয়ংক্রিয়ভাবে প্রতিটি স্টোরফ্রন্ট পেজে লোড হয়।
            </>
          ),
        },
      ],
      warning: (
        <>
          এটিকে Measurement ID (<code>G-XXXXXXX</code>)-এর সাথে গুলিয়ে ফেলবেন না। Tag Manager আইডি সবসময়{" "}
          <code>GTM-</code> দিয়ে শুরু হয়।
        </>
      ),
    },
  };
}
