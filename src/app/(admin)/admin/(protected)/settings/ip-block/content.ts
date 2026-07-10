// Page-local bilingual copy for the IP Block settings page.
// The in-page language toggle switches between these two dictionaries; it does
// not touch the site-wide NEXT_LOCALE cookie — it only affects this page.

export type IpBlockLang = "en" | "bn";

export interface IpBlockCopy {
  toggleLabel: string;
  heading: string;
  subtitle: (count: number) => string;
  cards: { title: string; body: string }[];
  addForm: {
    heading: string;
    subtitle: string;
    ipPlaceholder: string;
    reasonPlaceholder: string;
    block: string;
    blocking: string;
  };
  list: {
    colIp: string;
    colReason: string;
    colSince: string;
    noReason: string;
    dash: string;
    blockedOn: (date: string) => string;
    confirm: string;
    cancel: string;
    unblock: string;
    emptyTitle: string;
    emptyBody: string;
  };
}

export const IP_BLOCK_COPY: Record<IpBlockLang, IpBlockCopy> = {
  en: {
    toggleLabel: "বাংলা",
    heading: "IP Block",
    subtitle: (count) => `${count} address${count === 1 ? "" : "es"} currently blocked.`,
    cards: [
      {
        title: "What is IP Block?",
        body: "A list of IP addresses that are denied access to your storefront and admin endpoints. Any request from a blocked address is rejected immediately, before it reaches your app logic or database.",
      },
      {
        title: "Why we need this?",
        body: "It stops abusive traffic at the door — fake orders, credential stuffing, scraping, spam form submissions, and repeated failed logins — without you having to chase it down after the fact.",
      },
      {
        title: "How it protects you?",
        body: "Block the source IP behind suspicious activity (e.g. from order or login logs) and it's denied on every future request. Combine with rate limiting and strong auth for layered protection — IP blocking alone won't stop attackers using rotating IPs or VPNs.",
      },
    ],
    addForm: {
      heading: "Block a new IP address",
      subtitle: "Requests from this address will be rejected before they reach your storefront.",
      ipPlaceholder: "203.0.113.5",
      reasonPlaceholder: "Reason (optional)",
      block: "Block IP",
      blocking: "Blocking...",
    },
    list: {
      colIp: "IP Address",
      colReason: "Reason",
      colSince: "Blocked Since",
      noReason: "No reason given",
      dash: "—",
      blockedOn: (date) => `Blocked ${date}`,
      confirm: "Confirm",
      cancel: "Cancel",
      unblock: "Unblock",
      emptyTitle: "No blocked IPs",
      emptyBody: "Addresses you block will show up here.",
    },
  },
  bn: {
    toggleLabel: "English",
    heading: "আইপি ব্লক",
    subtitle: (count) => `বর্তমানে ${count}টি ঠিকানা ব্লক করা আছে।`,
    cards: [
      {
        title: "আইপি ব্লক কী?",
        body: "এটি এমন আইপি ঠিকানার একটি তালিকা যেগুলোকে আপনার স্টোরফ্রন্ট ও অ্যাডমিন এন্ডপয়েন্টে প্রবেশ করতে দেওয়া হয় না। ব্লক করা কোনো ঠিকানা থেকে আসা রিকোয়েস্ট আপনার অ্যাপ লজিক বা ডেটাবেসে পৌঁছানোর আগেই তাৎক্ষণিকভাবে প্রত্যাখ্যান করা হয়।",
      },
      {
        title: "কেন আমাদের এটি দরকার?",
        body: "এটি অপব্যবহারমূলক ট্রাফিক শুরুতেই থামায় — ভুয়া অর্ডার, ক্রেডেনশিয়াল স্টাফিং, স্ক্র্যাপিং, স্প্যাম ফর্ম সাবমিশন, এবং বারবার ব্যর্থ লগইন — পরে খুঁজে বের করার ঝামেলা ছাড়াই।",
      },
      {
        title: "এটি কীভাবে আপনাকে রক্ষা করে?",
        body: "সন্দেহজনক কার্যকলাপের পেছনের সোর্স আইপি ব্লক করুন (যেমন অর্ডার বা লগইন লগ থেকে), তাহলে ভবিষ্যতের প্রতিটি রিকোয়েস্টে সেটি প্রত্যাখ্যাত হবে। স্তরযুক্ত সুরক্ষার জন্য রেট লিমিটিং ও শক্তিশালী অথেন্টিকেশনের সাথে ব্যবহার করুন — শুধু আইপি ব্লকিং ঘূর্ণায়মান আইপি বা ভিপিএন ব্যবহারকারী আক্রমণকারীদের থামাবে না।",
      },
    ],
    addForm: {
      heading: "নতুন একটি আইপি ঠিকানা ব্লক করুন",
      subtitle: "এই ঠিকানা থেকে আসা রিকোয়েস্ট আপনার স্টোরফ্রন্টে পৌঁছানোর আগেই প্রত্যাখ্যান করা হবে।",
      ipPlaceholder: "203.0.113.5",
      reasonPlaceholder: "কারণ (ঐচ্ছিক)",
      block: "আইপি ব্লক করুন",
      blocking: "ব্লক করা হচ্ছে...",
    },
    list: {
      colIp: "আইপি ঠিকানা",
      colReason: "কারণ",
      colSince: "যখন থেকে ব্লক",
      noReason: "কোনো কারণ দেওয়া হয়নি",
      dash: "—",
      blockedOn: (date) => `${date} থেকে ব্লক`,
      confirm: "নিশ্চিত করুন",
      cancel: "বাতিল",
      unblock: "আনব্লক",
      emptyTitle: "কোনো ব্লক করা আইপি নেই",
      emptyBody: "আপনি যেসব ঠিকানা ব্লক করবেন সেগুলো এখানে দেখা যাবে।",
    },
  },
};
