// Page-local bilingual copy for the SMTP (Mail) settings page.
// The in-page language toggle switches between these two dictionaries; it does
// not touch the site-wide NEXT_LOCALE cookie — it only affects this page.

import type { ReactNode } from "react";

export type SmtpLang = "en" | "bn";

export interface SmtpCopy {
  toggleLabel: string;
  heading: string;
  intro: string;
  form: {
    serverHeading: string;
    serverSubtitle: string;
    configured: string;
    notConfigured: string;
    hostLabel: string;
    portLabel: string;
    tlsLabel: string;
    usernameLabel: string;
    passwordLabel: string;
    passwordKeepPlaceholder: string;
    passwordPlaceholder: string;
    passwordHelp: string;
    senderHeading: string;
    senderSubtitle: string;
    fromAddressLabel: string;
    fromNameLabel: string;
    saved: string;
    save: string;
    saving: string;
  };
  whatIs: {
    heading: string;
    body: ReactNode;
    note: string;
  };
  gmail: {
    heading: string;
    subtitle: string;
    steps: { title: string; body: ReactNode }[];
    warning: ReactNode;
  };
  domain: {
    heading: string;
    subtitle: string;
    intro: ReactNode;
    cpanelTitle: string;
    cpanelBody: ReactNode;
    serviceTitle: string;
    serviceBody: ReactNode;
    warning: ReactNode;
  };
}

const code = "rounded bg-stone-100 px-1 font-mono text-[12px]";

export function buildCopy(lang: SmtpLang): SmtpCopy {
  return lang === "en" ? enCopy() : bnCopy();
}

function enCopy(): SmtpCopy {
  return {
    toggleLabel: "বাংলা",
    heading: "SMTP (Mail)",
    intro:
      "Set up outgoing email so your store can send order confirmations and sign-in links. Follow a guide on the right, then save your credentials.",
    form: {
      serverHeading: "Mail server",
      serverSubtitle: "Connection to your SMTP provider.",
      configured: "Configured",
      notConfigured: "Not configured",
      hostLabel: "SMTP Host",
      portLabel: "Port",
      tlsLabel: "Use TLS (port 465)",
      usernameLabel: "Username",
      passwordLabel: "Password",
      passwordKeepPlaceholder: "Leave blank to keep current password",
      passwordPlaceholder: "App password",
      passwordHelp: "A password is already saved. Leave blank to keep it.",
      senderHeading: "Sender identity",
      senderSubtitle: "How emails appear in the customer's inbox.",
      fromAddressLabel: "From Address",
      fromNameLabel: "From Name",
      saved: "Saved.",
      save: "Save settings",
      saving: "Saving…",
    },
    whatIs: {
      heading: "What is SMTP?",
      body: (
        <>
          <b className="text-stone-700">SMTP</b> (Simple Mail Transfer Protocol) is the standard your store
          uses to hand outgoing emails — order confirmations and sign-in links — to a mail server that
          delivers them. Enter the credentials of any mail provider here and the store sends through it.
        </>
      ),
      note: "Emails only send while the background worker process is running.",
    },
    gmail: {
      heading: "Configure with Gmail",
      subtitle: "Good for testing & low volume",
      steps: [
        {
          title: "Enable 2-Step Verification",
          body: (
            <>
              In your{" "}
              <a
                href="https://myaccount.google.com/security"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-600 underline underline-offset-2"
              >
                Google Account security
              </a>{" "}
              settings — required before you can create an app password.
            </>
          ),
        },
        {
          title: "Create an App Password",
          body: (
            <>
              Go to{" "}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-600 underline underline-offset-2"
              >
                App passwords
              </a>{" "}
              and generate a 16-character password. Use this — <b>not</b> your normal login password.
            </>
          ),
        },
        {
          title: "Fill in the form",
          body: (
            <ul className="space-y-0.5">
              <li>
                Host: <code className={code}>smtp.gmail.com</code>
              </li>
              <li>
                Port: <code className={code}>587</code>, TLS off
              </li>
              <li>Username &amp; From: your Gmail address</li>
              <li>Password: the app password</li>
            </ul>
          ),
        },
      ],
      warning: (
        <>
          The <b>From Address</b> must be your own Gmail address — Gmail rejects sending as a different
          address. Daily limit ≈ 500 emails.
        </>
      ),
    },
    domain: {
      heading: "Configure with your own domain",
      subtitle: "Recommended for production",
      intro: (
        <>
          To send as <code className={code}>orders@yourstore.com</code>, use the SMTP details from your email
          host. Two common options:
        </>
      ),
      cpanelTitle: "Hosting / cPanel mailbox",
      cpanelBody: (
        <>
          Create the mailbox in cPanel → Email Accounts → Connect Devices. Use the host (often{" "}
          <code className={code}>mail.yourstore.com</code>), port <code className={code}>465</code> with TLS
          on, and the full email + its password.
        </>
      ),
      serviceTitle: "Transactional service",
      serviceBody: (
        <>
          Providers like <b>Resend</b>, <b>SendGrid</b>, <b>Postmark</b>, or <b>Amazon SES</b> give you an
          SMTP host, username, and API-key password. Best deliverability at scale.
        </>
      ),
      warning: (
        <>
          Add <b>SPF</b> and <b>DKIM</b> DNS records for your domain so your emails don&apos;t land in spam.
        </>
      ),
    },
  };
}

function bnCopy(): SmtpCopy {
  return {
    toggleLabel: "English",
    heading: "SMTP (মেইল)",
    intro:
      "আউটগোয়িং ইমেইল সেট আপ করুন যাতে আপনার স্টোর অর্ডার নিশ্চিতকরণ ও সাইন-ইন লিঙ্ক পাঠাতে পারে। ডানপাশের গাইড অনুসরণ করুন, তারপর আপনার ক্রেডেনশিয়াল সংরক্ষণ করুন।",
    form: {
      serverHeading: "মেইল সার্ভার",
      serverSubtitle: "আপনার SMTP প্রোভাইডারের সাথে সংযোগ।",
      configured: "কনফিগার করা হয়েছে",
      notConfigured: "কনফিগার করা নেই",
      hostLabel: "SMTP হোস্ট",
      portLabel: "পোর্ট",
      tlsLabel: "TLS ব্যবহার করুন (পোর্ট ৪৬৫)",
      usernameLabel: "ইউজারনেম",
      passwordLabel: "পাসওয়ার্ড",
      passwordKeepPlaceholder: "বর্তমান পাসওয়ার্ড রাখতে খালি রাখুন",
      passwordPlaceholder: "অ্যাপ পাসওয়ার্ড",
      passwordHelp: "একটি পাসওয়ার্ড ইতিমধ্যে সংরক্ষিত আছে। রাখতে চাইলে খালি রাখুন।",
      senderHeading: "প্রেরকের পরিচয়",
      senderSubtitle: "গ্রাহকের ইনবক্সে ইমেইল কীভাবে দেখাবে।",
      fromAddressLabel: "প্রেরকের ঠিকানা (From)",
      fromNameLabel: "প্রেরকের নাম (From)",
      saved: "সংরক্ষিত হয়েছে।",
      save: "সেটিংস সংরক্ষণ করুন",
      saving: "সংরক্ষণ হচ্ছে…",
    },
    whatIs: {
      heading: "SMTP কী?",
      body: (
        <>
          <b className="text-stone-700">SMTP</b> (Simple Mail Transfer Protocol) হলো সেই স্ট্যান্ডার্ড যা
          আপনার স্টোর আউটগোয়িং ইমেইল — অর্ডার নিশ্চিতকরণ ও সাইন-ইন লিঙ্ক — একটি মেইল সার্ভারের কাছে পৌঁছে
          দিতে ব্যবহার করে, যেটি সেগুলো ডেলিভার করে। এখানে যেকোনো মেইল প্রোভাইডারের ক্রেডেনশিয়াল দিন, স্টোর
          সেটির মাধ্যমে পাঠাবে।
        </>
      ),
      note: "ব্যাকগ্রাউন্ড ওয়ার্কার প্রসেস চালু থাকলেই কেবল ইমেইল পাঠানো হয়।",
    },
    gmail: {
      heading: "Gmail দিয়ে কনফিগার করুন",
      subtitle: "টেস্টিং ও কম ভলিউমের জন্য ভালো",
      steps: [
        {
          title: "২-ধাপ যাচাইকরণ চালু করুন",
          body: (
            <>
              আপনার{" "}
              <a
                href="https://myaccount.google.com/security"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-600 underline underline-offset-2"
              >
                Google Account security
              </a>{" "}
              সেটিংসে — অ্যাপ পাসওয়ার্ড তৈরির আগে এটি আবশ্যক।
            </>
          ),
        },
        {
          title: "একটি অ্যাপ পাসওয়ার্ড তৈরি করুন",
          body: (
            <>
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-600 underline underline-offset-2"
              >
                App passwords
              </a>{" "}
              এ গিয়ে ১৬-অক্ষরের একটি পাসওয়ার্ড তৈরি করুন। এটিই ব্যবহার করুন — আপনার সাধারণ লগইন পাসওয়ার্ড{" "}
              <b>নয়</b>।
            </>
          ),
        },
        {
          title: "ফর্মটি পূরণ করুন",
          body: (
            <ul className="space-y-0.5">
              <li>
                হোস্ট: <code className={code}>smtp.gmail.com</code>
              </li>
              <li>
                পোর্ট: <code className={code}>587</code>, TLS বন্ধ
              </li>
              <li>ইউজারনেম ও From: আপনার Gmail ঠিকানা</li>
              <li>পাসওয়ার্ড: অ্যাপ পাসওয়ার্ডটি</li>
            </ul>
          ),
        },
      ],
      warning: (
        <>
          <b>প্রেরকের ঠিকানা</b> অবশ্যই আপনার নিজের Gmail ঠিকানা হতে হবে — Gmail ভিন্ন ঠিকানা থেকে পাঠানো
          প্রত্যাখ্যান করে। দৈনিক সীমা ≈ ৫০০ ইমেইল।
        </>
      ),
    },
    domain: {
      heading: "নিজের ডোমেইন দিয়ে কনফিগার করুন",
      subtitle: "প্রোডাকশনের জন্য প্রস্তাবিত",
      intro: (
        <>
          <code className={code}>orders@yourstore.com</code> হিসেবে পাঠাতে আপনার ইমেইল হোস্টের SMTP তথ্য
          ব্যবহার করুন। দুটি সাধারণ অপশন:
        </>
      ),
      cpanelTitle: "হোস্টিং / cPanel মেইলবক্স",
      cpanelBody: (
        <>
          cPanel → Email Accounts → Connect Devices-এ মেইলবক্স তৈরি করুন। হোস্ট (প্রায়ই{" "}
          <code className={code}>mail.yourstore.com</code>), পোর্ট <code className={code}>465</code> TLS চালু
          রেখে, এবং সম্পূর্ণ ইমেইল + তার পাসওয়ার্ড ব্যবহার করুন।
        </>
      ),
      serviceTitle: "ট্রানজ্যাকশনাল সার্ভিস",
      serviceBody: (
        <>
          <b>Resend</b>, <b>SendGrid</b>, <b>Postmark</b>, বা <b>Amazon SES</b>-এর মতো প্রোভাইডার আপনাকে একটি
          SMTP হোস্ট, ইউজারনেম ও API-key পাসওয়ার্ড দেয়। বড় পরিসরে সেরা ডেলিভারেবিলিটি।
        </>
      ),
      warning: (
        <>
          আপনার ডোমেইনের জন্য <b>SPF</b> ও <b>DKIM</b> DNS রেকর্ড যোগ করুন যাতে আপনার ইমেইল স্প্যামে না যায়।
        </>
      ),
    },
  };
}
