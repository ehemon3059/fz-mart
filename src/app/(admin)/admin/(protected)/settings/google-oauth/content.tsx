// Page-local bilingual copy for the Google Sign-In (OAuth) settings page.
// The in-page language toggle switches between these two dictionaries; it does
// not touch the site-wide NEXT_LOCALE cookie — it only affects this page.

import type { ReactNode } from "react";

export type OAuthLang = "en" | "bn";

export interface OAuthCopy {
  toggleLabel: string;
  heading: string;
  intro: string;
  cards: { title: string; body: string }[];
  form: {
    credsHeading: string;
    credsSubtitle: string;
    configured: string;
    notConfigured: string;
    clientIdLabel: string;
    clientIdPlaceholder: string;
    clientSecretLabel: string;
    clientSecretKeepPlaceholder: string;
    clientSecretPlaceholder: string;
    clientSecretHelp: string;
    redirectLabel: string;
    // Split around the inline <code>/login/google/callback</code>.
    redirectHelpPrefix: string;
    redirectHelpSuffix: string;
    saved: string;
    save: string;
    saving: string;
    copy: string;
    copied: string;
  };
  guide: {
    heading: string;
    subtitle: string;
    steps: { title: string; body: ReactNode }[];
    warningPrefix: string; // text before the inline codes in the warning box
  };
}

// The step bodies contain inline markup/links, so they're built by a factory
// that receives the derived origin + redirect URI and the CopyField renderer.
export interface GuideDeps {
  origin: string;
  redirectUri: string;
  CopyField: (props: { value: string }) => ReactNode;
}

export function buildCopy(lang: OAuthLang, deps: GuideDeps): OAuthCopy {
  const { origin, redirectUri, CopyField } = deps;
  return lang === "en" ? enCopy(origin, redirectUri, CopyField) : bnCopy(origin, redirectUri, CopyField);
}

function enCopy(origin: string, redirectUri: string, CopyField: GuideDeps["CopyField"]): OAuthCopy {
  return {
    toggleLabel: "বাংলা",
    heading: "Google Sign-In",
    intro:
      'Enable "Continue with Google" on the storefront login. Follow the steps on the right to get a Client ID and Secret, then save them here.',
    cards: [
      {
        title: "What is Google OAuth?",
        body: "Google OAuth is a secure sign-in standard that lets customers log in to your store using their existing Google account — no new password to create. Google verifies who they are and hands your store a trusted token, so you never see or store their Google password.",
      },
      {
        title: "Why do we use it?",
        body: 'It powers the "Continue with Google" button on the storefront login. One tap signs a customer in or creates their account instantly, removing the friction of remembering yet another password and cutting drop-off at the login step.',
      },
      {
        title: "What is the benefit?",
        body: "Faster checkout and higher conversion (fewer abandoned logins), fewer forgotten-password support requests, verified real email addresses, and stronger security — Google handles the password and 2FA, so your store carries less risk.",
      },
    ],
    form: {
      credsHeading: "OAuth credentials",
      credsSubtitle: "From your Google Cloud OAuth client.",
      configured: "Configured",
      notConfigured: "Not configured",
      clientIdLabel: "Client ID",
      clientIdPlaceholder: "xxxxx.apps.googleusercontent.com",
      clientSecretLabel: "Client Secret",
      clientSecretKeepPlaceholder: "Leave blank to keep current secret",
      clientSecretPlaceholder: "GOCSPX-…",
      clientSecretHelp: "A secret is already saved. Leave this blank unless you're rotating it.",
      redirectLabel: "Authorized Redirect URI",
      redirectHelpPrefix: 'Must match an entry under "Authorized redirect URIs" in Google Cloud exactly, and end with',
      redirectHelpSuffix: ".",
      saved: "Saved.",
      save: "Save credentials",
      saving: "Saving…",
      copy: "Copy",
      copied: "Copied",
    },
    guide: {
      heading: "How to set up",
      subtitle: "One-time setup in Google Cloud",
      steps: [
        {
          title: "Open Google Cloud Credentials",
          body: (
            <>
              Go to the{" "}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-600 underline underline-offset-2"
              >
                Credentials page
              </a>{" "}
              and pick or create a project.
            </>
          ),
        },
        {
          title: "Configure consent screen",
          body: (
            <>
              Set up the <b>OAuth consent screen</b> (External). Add your email as a test user, or publish
              the app to go public.
            </>
          ),
        },
        {
          title: "Create OAuth client ID",
          body: (
            <>
              <b>Create Credentials → OAuth client ID</b>, application type <b>Web application</b>.
            </>
          ),
        },
        {
          title: "Add JavaScript origin",
          body: (
            <>
              Under <b>Authorized JavaScript origins</b>, add:
              <div className="mt-2">
                <CopyField value={origin} />
              </div>
            </>
          ),
        },
        {
          title: "Add redirect URI",
          body: (
            <>
              Under <b>Authorized redirect URIs</b>, add this exact value:
              <div className="mt-2">
                <CopyField value={redirectUri} />
              </div>
            </>
          ),
        },
        {
          title: "Save credentials here",
          body: (
            <>
              Click <b>Create</b>, then paste the <b>Client ID</b> and <b>Secret</b> into the form and press{" "}
              <b>Save credentials</b>.
            </>
          ),
        },
      ],
      warningPrefix: "The redirect URI must match Google character-for-character —",
    },
  };
}

function bnCopy(origin: string, redirectUri: string, CopyField: GuideDeps["CopyField"]): OAuthCopy {
  return {
    toggleLabel: "English",
    heading: "গুগল সাইন-ইন",
    intro:
      'স্টোরফ্রন্ট লগইনে "Continue with Google" চালু করুন। ডানপাশের ধাপগুলো অনুসরণ করে একটি Client ID ও Secret সংগ্রহ করুন, তারপর এখানে সংরক্ষণ করুন।',
    cards: [
      {
        title: "গুগল OAuth কী?",
        body: "গুগল OAuth একটি নিরাপদ সাইন-ইন স্ট্যান্ডার্ড, যা গ্রাহকদের তাদের বিদ্যমান গুগল অ্যাকাউন্ট দিয়ে আপনার স্টোরে লগইন করতে দেয় — নতুন কোনো পাসওয়ার্ড তৈরি করতে হয় না। গুগল তাদের পরিচয় যাচাই করে আপনার স্টোরকে একটি বিশ্বস্ত টোকেন দেয়, ফলে আপনি কখনো তাদের গুগল পাসওয়ার্ড দেখেন বা সংরক্ষণ করেন না।",
      },
      {
        title: "আমরা কেন এটি ব্যবহার করি?",
        body: 'এটি স্টোরফ্রন্ট লগইনের "Continue with Google" বোতামটি চালায়। এক ট্যাপেই গ্রাহক সাইন-ইন হন বা তাৎক্ষণিকভাবে অ্যাকাউন্ট তৈরি হয়, আরেকটি পাসওয়ার্ড মনে রাখার ঝামেলা দূর করে এবং লগইন ধাপে গ্রাহক হারানো কমায়।',
      },
      {
        title: "এর সুবিধা কী?",
        body: "দ্রুত চেকআউট ও বেশি কনভার্সন (কম পরিত্যক্ত লগইন), ভুলে যাওয়া পাসওয়ার্ডের কম সাপোর্ট রিকোয়েস্ট, যাচাইকৃত আসল ইমেইল ঠিকানা, এবং শক্তিশালী নিরাপত্তা — পাসওয়ার্ড ও টু-ফ্যাক্টর গুগল সামলায়, তাই আপনার স্টোরের ঝুঁকি কম থাকে।",
      },
    ],
    form: {
      credsHeading: "OAuth ক্রেডেনশিয়াল",
      credsSubtitle: "আপনার গুগল ক্লাউড OAuth ক্লায়েন্ট থেকে।",
      configured: "কনফিগার করা হয়েছে",
      notConfigured: "কনফিগার করা নেই",
      clientIdLabel: "Client ID",
      clientIdPlaceholder: "xxxxx.apps.googleusercontent.com",
      clientSecretLabel: "Client Secret",
      clientSecretKeepPlaceholder: "বর্তমান সিক্রেট রাখতে খালি রাখুন",
      clientSecretPlaceholder: "GOCSPX-…",
      clientSecretHelp: "একটি সিক্রেট ইতিমধ্যে সংরক্ষিত আছে। রোটেট না করলে এটি খালি রাখুন।",
      redirectLabel: "অনুমোদিত রিডাইরেক্ট URI",
      redirectHelpPrefix:
        'গুগল ক্লাউডের "Authorized redirect URIs"-এর একটি এন্ট্রির সাথে হুবহু মিলতে হবে এবং শেষ হতে হবে',
      redirectHelpSuffix: " দিয়ে।",
      saved: "সংরক্ষিত হয়েছে।",
      save: "ক্রেডেনশিয়াল সংরক্ষণ করুন",
      saving: "সংরক্ষণ হচ্ছে…",
      copy: "কপি",
      copied: "কপি হয়েছে",
    },
    guide: {
      heading: "কীভাবে সেটআপ করবেন",
      subtitle: "গুগল ক্লাউডে একবারের সেটআপ",
      steps: [
        {
          title: "গুগল ক্লাউড ক্রেডেনশিয়াল খুলুন",
          body: (
            <>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-600 underline underline-offset-2"
              >
                Credentials পেজে
              </a>{" "}
              যান এবং একটি প্রজেক্ট বেছে নিন বা তৈরি করুন।
            </>
          ),
        },
        {
          title: "কনসেন্ট স্ক্রিন কনফিগার করুন",
          body: (
            <>
              <b>OAuth consent screen</b> (External) সেট আপ করুন। আপনার ইমেইল টেস্ট ইউজার হিসেবে যোগ করুন,
              অথবা পাবলিক করতে অ্যাপটি প্রকাশ করুন।
            </>
          ),
        },
        {
          title: "OAuth client ID তৈরি করুন",
          body: (
            <>
              <b>Create Credentials → OAuth client ID</b>, অ্যাপ্লিকেশন টাইপ <b>Web application</b>।
            </>
          ),
        },
        {
          title: "JavaScript origin যোগ করুন",
          body: (
            <>
              <b>Authorized JavaScript origins</b>-এর নিচে যোগ করুন:
              <div className="mt-2">
                <CopyField value={origin} />
              </div>
            </>
          ),
        },
        {
          title: "রিডাইরেক্ট URI যোগ করুন",
          body: (
            <>
              <b>Authorized redirect URIs</b>-এর নিচে হুবহু এই মানটি যোগ করুন:
              <div className="mt-2">
                <CopyField value={redirectUri} />
              </div>
            </>
          ),
        },
        {
          title: "এখানে ক্রেডেনশিয়াল সংরক্ষণ করুন",
          body: (
            <>
              <b>Create</b> ক্লিক করুন, তারপর <b>Client ID</b> ও <b>Secret</b> ফর্মে পেস্ট করে{" "}
              <b>ক্রেডেনশিয়াল সংরক্ষণ করুন</b> চাপুন।
            </>
          ),
        },
      ],
      warningPrefix: "রিডাইরেক্ট URI গুগলের সাথে অক্ষরে-অক্ষরে মিলতে হবে —",
    },
  };
}
