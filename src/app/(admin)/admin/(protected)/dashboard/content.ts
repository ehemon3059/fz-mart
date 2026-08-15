// Page-local bilingual copy for the admin dashboard, same pattern as
// settings/courier and inventory: an in-page toggle swaps dictionaries without
// touching the site-wide NEXT_LOCALE cookie.
//
// The Bangla explains what each number MEANS, not just what it is called — the
// dashboard is where an owner learns how the system thinks, so a label like
// "Delivered Revenue" earns a sentence saying it only counts delivered orders.

export type DashLang = "en" | "bn";

export interface DashboardCopy {
  toggleLabel: string;
  heading: string;
  subtitle: string;

  lowStock: (n: number) => string;
  lowStockLink: string;
  left: string;

  kpiOrdersToday: string;
  kpiOrdersTodaySub: (revenue: string) => string;
  kpiPending: string;
  kpiPendingSub: string;
  kpiProducts: string;
  kpiProductsSub: string;
  kpiRevenue: string;
  kpiRevenueSub: (orders: number) => string;

  pipeline: string;
  allOrders: string;

  funnel: string;
  abandonment: string;
  funnelTop: string;
  funnelNote: string;

  recentOrders: string;
  viewAll: string;
  colOrderNo: string;
  colCustomer: string;
  colTotal: string;
  colStatus: string;
  colPlaced: string;
  noOrders: string;

  insights: string;
  best7: string;
  best30: string;
  noSalesTitle: string;
  noSalesBody: string;
  viewProducts: string;
  sold: string;
  salesByCategory: string;
  noCategorySalesBody: string;
  items: string;
  repeatCustomers: string;
  repeatSub: (repeat: number, total: number) => string;
  courierSuccess: string;
  noCourier: string;
}

export const DASHBOARD_COPY: Record<DashLang, DashboardCopy> = {
  en: {
    toggleLabel: "বাংলা",
    heading: "Dashboard",
    subtitle: "How the shop is doing today, and where the money actually goes.",

    lowStock: (n) => `${n} product${n === 1 ? "" : "s"} low on stock`,
    lowStockLink: "Stock overview",
    left: "left",

    kpiOrdersToday: "Orders Today",
    kpiOrdersTodaySub: (revenue) => `${revenue} today`,
    kpiPending: "Pending Orders",
    kpiPendingSub: "Awaiting confirmation",
    kpiProducts: "Active Products",
    kpiProductsSub: "Currently published",
    kpiRevenue: "Delivered Revenue",
    kpiRevenueSub: (orders) => `${orders} orders all-time`,

    pipeline: "Order Pipeline",
    allOrders: "All orders",

    funnel: "Conversion Funnel · last 30 days",
    abandonment: "Checkout abandonment:",
    funnelTop: "top",
    funnelNote:
      "Server-recorded storefront events (bots and blocked IPs excluded); views are counted once per visitor per product per day. Retained for 90 days.",

    recentOrders: "Recent Orders",
    viewAll: "View all",
    colOrderNo: "Order No.",
    colCustomer: "Customer",
    colTotal: "Total",
    colStatus: "Status",
    colPlaced: "Placed",
    noOrders: "No orders yet.",

    insights: "Insights",
    best7: "Best sellers · last 7 days",
    best30: "Best sellers · last 30 days",
    noSalesTitle: "No delivered sales yet",
    noSalesBody: "Sales appear here once orders reach Delivered.",
    viewProducts: "View products",
    sold: "sold",
    salesByCategory: "Sales by category",
    noCategorySalesBody: "Category revenue builds up as orders are delivered.",
    items: "items",
    repeatCustomers: "Repeat customers",
    repeatSub: (repeat, total) => `${repeat} of ${total} customers ordered more than once`,
    courierSuccess: "COD delivery success by courier",
    noCourier: "No courier shipments yet.",
  },

  bn: {
    toggleLabel: "English",
    heading: "ড্যাশবোর্ড",
    subtitle: "আজ দোকান কেমন চলছে, আর টাকা আসলে কোথায় যাচ্ছে।",

    lowStock: (n) => `${n}টি পণ্যের স্টক কমে গেছে`,
    lowStockLink: "স্টক দেখুন",
    left: "বাকি",

    kpiOrdersToday: "আজকের অর্ডার",
    kpiOrdersTodaySub: (revenue) => `আজ ${revenue}`,
    kpiPending: "পেন্ডিং অর্ডার",
    kpiPendingSub: "কনফার্ম করা বাকি",
    kpiProducts: "অ্যাকটিভ পণ্য",
    kpiProductsSub: "এখন ওয়েবসাইটে আছে",
    kpiRevenue: "ডেলিভারি হওয়া বিক্রি",
    kpiRevenueSub: (orders) => `সব মিলিয়ে ${orders}টি অর্ডার`,

    pipeline: "অর্ডার পাইপলাইন",
    allOrders: "সব অর্ডার",

    funnel: "কনভার্শন ফানেল · গত ৩০ দিন",
    abandonment: "চেকআউট ছেড়ে যাওয়ার হার:",
    funnelTop: "শুরু",
    funnelNote:
      "সার্ভারে রেকর্ড করা ইভেন্ট (বট ও ব্লক করা আইপি বাদ)। একজন ভিজিটরের একই পণ্য দেখা দিনে একবারই গোনা হয়। ৯০ দিন রাখা হয়।",

    recentOrders: "সাম্প্রতিক অর্ডার",
    viewAll: "সব দেখুন",
    colOrderNo: "অর্ডার নং",
    colCustomer: "কাস্টমার",
    colTotal: "মোট",
    colStatus: "অবস্থা",
    colPlaced: "তারিখ",
    noOrders: "এখনো কোনো অর্ডার নেই।",

    insights: "বিশ্লেষণ",
    best7: "বেস্ট সেলার · গত ৭ দিন",
    best30: "বেস্ট সেলার · গত ৩০ দিন",
    noSalesTitle: "এখনো ডেলিভারি হওয়া বিক্রি নেই",
    noSalesBody: "অর্ডার ডেলিভারড হলে এখানে বিক্রি দেখা যাবে।",
    viewProducts: "পণ্য দেখুন",
    sold: "বিক্রি",
    salesByCategory: "ক্যাটাগরি অনুযায়ী বিক্রি",
    noCategorySalesBody: "অর্ডার ডেলিভারি হতে থাকলে এখানে হিসাব জমতে থাকবে।",
    items: "পিস",
    repeatCustomers: "রিপিট কাস্টমার",
    repeatSub: (repeat, total) => `${total} জনের মধ্যে ${repeat} জন একাধিকবার অর্ডার করেছেন`,
    courierSuccess: "কুরিয়ার অনুযায়ী COD ডেলিভারি সফলতা",
    noCourier: "এখনো কোনো কুরিয়ার শিপমেন্ট নেই।",
  },
};
