# FZ-Mart — Easy Inventory (ছবিতে হিসাব)

> Source page: `https://www.fzmartbd.com/admin/guide/easy-inventory`
> Companion document: **FZ-Mart — Admin Operating Guide (কর্মপদ্ধতি)** — `https://www.fzmartbd.com/admin/guide`
> The live page is **fully illustrated**: every section is an SVG diagram. This markdown reproduces each diagram as a table or a described flow, so nothing is lost in text form. Prose is in **Bangla**; screen names and field labels stay in **English**.

---

## 0. How this document relates to the other one

| Document | Question it answers |
| --- | --- |
| **কর্মপদ্ধতি** (`/admin/guide`) | "কোন বাটনে চাপব" — which form, which field, which button, step by step. |
| **ছবিতে হিসাব** (`/admin/guide/easy-inventory`) — *this one* | "আমার টাকা কোথায় গেল, আর লাভ হলো কি না" — where the money goes, drawn as pictures. |

**One worked example runs through this entire document:** purchase order **PO-0042** from supplier **রহমান টেক্সটাইল**, worth **৳১,১৫,০০০**, followed from the supplier's invoice all the way to the month's **৳৩৫,৩৮০** net profit. Every figure below is derived from that one example, so the numbers are internally consistent.

**Number formatting note:** all figures use Bangla numerals and **Bangladeshi digit grouping** (১,১৫,০০০ — lakh/thousand grouping, not the Western ১১৫,০০০). Currency is Bangladeshi Taka (৳).

---

## Masthead

**FZ-Mart · Easy Inventory**

### ছবিতে দেখুন — পণ্য কীভাবে এল, কীভাবে বিক্রি হলো, লাভ কোথায়

একটি চালান, শুরু থেকে শেষ পর্যন্ত। ৳১,১৫,০০০ দিয়ে কেনা মাল কীভাবে গুদামে ঢোকে, কীভাবে ওয়েবসাইটে ওঠে, কীভাবে বিক্রি হয়, আর মাস শেষে তা থেকে কত টাকা আসলে থেকে যায় — প্রতিটি ধাপ ছবি দিয়ে দেখানো।

---

## 🖼️ Diagram 1 — পুরো গল্প এক নজরে
*"আপনার পুঁজি পাঁচবার রূপ বদলে ফিরে আসে" — the journey strip, drawn once at the top as the spine of the whole page.*

Flow: **PO → STOCK → LIVE → ORDER → DELIVERED → PROFIT**

| # | Key | Bangla title | টাকার অবস্থা | কোন স্ক্রিনে |
| --- | --- | --- | --- | --- |
| 1 | `PO` | ক্রয় আদেশ | − ৳১,১৫,০০০ | Purchase Orders |
| 2 | `STOCK` | মাল গুদামে | ৳১,১৫,০০০ এখন পণ্য | Stock Overview |
| 3 | `LIVE` | পণ্য লাইভ | বিক্রির জন্য প্রস্তুত | Products |
| 4 | `ORDER` | অর্ডার এল | মাল Reserved | Orders |
| 5 | `DELIVERED` | ডেলিভারি | + ৳১,২০০ প্রতি অর্ডারে | Orders |
| 6 | `PROFIT` | নিট লাভ | + ৳৩৫,৩৮০ এই মাসে | Profit & Loss |

---

# ধাপ ০১ — প্রথমে টাকা বেরোয়
*(টাকা → পণ্য · Cash becomes goods)*

সাপ্লায়ারকে দেওয়া দাম-ই চালানের একমাত্র খরচ নয়। মাল আনতে যে ভাড়া ও কাস্টমস লাগে, সেটাও ওই মালেরই খরচ। দুটো একসাথে না ধরলে পণ্য কত দিয়ে কেনা হলো তা কখনোই ঠিক জানা যাবে না।

### 🖼️ Diagram 2 — PO-0042 · রহমান টেক্সটাইল · চালানের মোট খরচ কীভাবে গঠিত
*A stacked bar splitting the shipment's total cost into two parts.*

| অংশ | টাকা | অনুপাত |
| --- | ---: | ---: |
| পণ্যের দাম (goods) | ৳১,০৯,০০০ | ৯৪.৮% |
| ভাড়া ও কাস্টমস (freight + customs) | ৳৬,০০০ | ৫.২% |
| **চালানের মোট খরচ** | **৳১,১৫,০০০** | **১০০%** |

### ছবিটি যা বলছে

- PO-0042-এ পণ্যের দাম ৳১,০৯,০০০, আর মাল আনার খরচ ৳৬,০০০।
- গুদামে ঢোকার সময় এই চালানের মোট খরচ ৳১,১৫,০০০ — এটাই আপনার আটকে যাওয়া পুঁজি।
- ভাড়ার অংশটা ছোট দেখাচ্ছে, কিন্তু এটাই প্রতি পিসের লাভ-লোকসান ঠিক করে দেয়।

**Screens:** `/admin/inventory/purchase-orders/new` (নতুন ক্রয় আদেশ) · `/admin/inventory/suppliers` (সাপ্লায়ার তালিকা)

---

# ধাপ ০২ — ভাড়া ভাগ হয়ে প্রতি পিসের খরচ দাঁড়ায়
*(আসল খরচ · Landed cost)*

মাল বুঝে নেওয়ার সময় প্যানেল পুরো চালানের ভাড়া ও কাস্টমস পণ্যগুলোর মধ্যে ভাগ করে দেয় — **মূল্য অনুপাতে (value-weighted)**। দামি পণ্য বেশি ভাড়া বহন করে, সস্তা পণ্য কম। এর পরের সংখ্যাটাই ওই পণ্যের আসল খরচ।

### 🖼️ Diagram 3 — মাল বুঝে নেওয়ার পর · প্রতি পিসের আসল খরচ (landed cost)
*Stacked bars per product: dark green = supplier's price, light green = that piece's share of freight & customs.*

| পণ্য | সাপ্লায়ারের দাম | + ভাড়া ও কাস্টমসের ভাগ | = আসল খরচ |
| --- | ---: | ---: | ---: |
| কটন পাঞ্জাবি — নেভি / L | ৳৮২০ | ৳৪৫ | **৳৮৬৫** |
| কটন পাঞ্জাবি — নেভি / M | ৳৮২০ | ৳৪৫ | **৳৮৬৫** |
| লিনেন শার্ট — সাদা / M | ৳৫৪০ | ৳৩০ | **৳৫৭০** |

### ছবিটি যা বলছে

- পাঞ্জাবির সাপ্লায়ার দাম ৳৮২০, ভাড়ার ভাগ ৳৪৫ — আসল খরচ ৳৮৬৫।
- শার্টের দাম কম, তাই ভাড়ার ভাগও কম — ৳৫৪০ + ৳৩০ = ৳৫৭০।
- এই আসল খরচই পণ্যের **Sourcing cost** হিসেবে বসে যায়, আর সব লাভের হিসাব এখান থেকেই হয়।

> ⚠️ পাঞ্জাবিটি ৳১,২০০ টাকায় বিক্রি করলে আপনার লাভ ৳৩৩৫, ৳৩৮০ নয়। ভাড়া বাদ দিলে প্রতিটি পিসেই লাভ বেশি দেখাবে — আর যত বেশি বিক্রি, ভুল তত বড় হবে।

**Screen:** `/admin/inventory/purchase-orders` (ক্রয় আদেশ তালিকা)

---

# ধাপ ০৩ — মাল থাকলেই বিক্রি হয় না, পণ্য লাইভ করতে হয়
*(গুদাম → দোকান · Warehouse to storefront)*

ক্রয় আদেশ থেকে তৈরি পণ্য **Draft** অবস্থায় থাকে। ছবি ও দাম না বসানো পর্যন্ত প্যানেল সেটিকে ওয়েবসাইটে উঠতেই দেবে না — আর ক্রেতা যা দেখে না, তা কেনেও না।

### 🖼️ Diagram 4 — পণ্যের দরজা
*"ছবি ও দাম না থাকলে পণ্য ওয়েবসাইটে ওঠে না" — a gate diagram with two locks.*

```
   DRAFT  ──►  [ 🔒 অন্তত একটি ছবি ]  +  [ 🔒 একটি দাম ]  ──►  ACTIVE
                          │
                          └──► দুটোর একটিও না থাকলে গেট বন্ধ, পণ্য Draft-এই আটকে থাকে
```

| অবস্থা | ক্রেতা দেখে? | মানে |
| --- | --- | --- |
| `Draft` | না | PO থেকে সদ্য তৈরি — ছবি ও দাম এখনো বাকি |
| `Active` | হ্যাঁ | ওয়েবসাইটে দেখা যাচ্ছে |
| `Hidden` | না | তৈরি, কিন্তু ইচ্ছে করে বন্ধ রাখা |

### ছবিটি যা বলছে

- **Draft** — PO থেকে সদ্য তৈরি, ক্রেতা দেখে না।
- গেট পেরোতে দুটো জিনিস লাগে: **অন্তত একটি ছবি**, আর **একটি দাম**।
- **Active** — ওয়েবসাইটে দেখা যাচ্ছে। **Hidden** — তৈরি, কিন্তু ইচ্ছে করে বন্ধ রাখা।

> ⚠️ গুদামে ৳১,১৫,০০০-এর মাল অথচ বিক্রি শূন্য — নতুন অ্যাডমিনের সবচেয়ে সাধারণ সমস্যাটি এখানেই। পণ্য তালিকায় Draft ফিল্টার দিয়ে দেখে নিন কোনগুলো আটকে আছে।

**Screen:** `/admin/products` (পণ্য তালিকা)

---

# ধাপ ০৪ — একই পণ্যের চারটি সংখ্যা
*(গুদামের হিসাব · Four stock numbers)*

স্টক একটি সংখ্যা নয়, চারটি। কোনটা কী বোঝায় তা না জানলে মনে হবে প্যানেল ভুল বলছে — অথচ প্রতিটি সংখ্যার আলাদা কাজ আছে।

### 🖼️ Diagram 5 — একটি পণ্যের স্টক
*"গুদামে ১০০, অর্ডার হয়ে আছে ১২, পথে আরও ৪০" — a bar showing how On hand splits into Reserved + Available, with Incoming drawn outside the warehouse.*

```
গুদামের ভিতরে (On hand = ১০০)
┌──────────────────────────────────────────────┐
│ Reserved ১২ │        Available ৮৮            │
└──────────────────────────────────────────────┘
                                                   গুদামের বাইরে, পথে:
                                                   Incoming ৪০  (আজ বিক্রি করা যাবে না)
```

| সংখ্যা | মান | মানে |
| --- | ---: | --- |
| `On hand` | ১০০ | গুদামে বাস্তবে যত পিস আছে |
| `Reserved` | ১২ | অর্ডার হয়ে গেছে, এখনো পাঠানো হয়নি |
| `Available` | ৮৮ | On hand − Reserved · ওয়েবসাইটে ঠিক এতটুকুই বিক্রি হতে পারে |
| `Incoming` | ৪০ | সাপ্লায়ারকে অর্ডার দেওয়া, এখনো আসেনি — **আজ বিক্রি করা যায় না** |

### ছবিটি যা বলছে

- On hand ১০০ — গুদামে বাস্তবে যত পিস আছে।
- Reserved ১২ — অর্ডার হয়ে গেছে, এখনো পাঠানো হয়নি।
- Available ৮৮ — ওয়েবসাইটে ঠিক এতটুকুই বিক্রি হতে পারে।
- Incoming ৪০ — সাপ্লায়ারকে অর্ডার দেওয়া, এখনো আসেনি। এটা আজ বিক্রি করা যায় না।

> ⚠️ Available শূন্য হলে পণ্যটি **Out** — পথে ৪০ পিস থাকলেও। লরির মাল আজ কারও হাতে দেওয়া যায় না, তাই প্যানেল সেটিকে বিক্রয়যোগ্য ধরে না।

**Screens:** `/admin/inventory` (স্টক তালিকা) · `/admin/inventory/movements` (স্টক লেজার)

---

# ধাপ ০৫ — অর্ডার থেকে টাকা, কোন ধাপে কী হয়
*(পণ্য → টাকা · Order lifecycle)*

অর্ডার হওয়া আর টাকা পাওয়া এক নয়। ক্যাশ অন ডেলিভারিতে টাকা আসে তখনই, যখন কুরিয়ার ক্রেতার হাতে মাল দেয়। তাই প্যানেল আয়ের হিসাব ডেলিভারির সাথে বেঁধে রাখে, অর্ডারের ক্লিকের সাথে নয়।

### 🖼️ Diagram 6 — একটি অর্ডারের যাত্রা
*"সবুজ ঘরটিই সেই মুহূর্ত যখন টাকা হিসাবে ওঠে" — five boxes left to right; the top row is what happens to stock, the bottom row is what happens in the books. Only `DELIVERED` is green.*

| অবস্থা | ⬆ স্টকে কী হয় | ⬇ হিসাবের খাতায় কী হয় |
| --- | --- | --- |
| `PENDING` | মাল Reserved · On hand অপরিবর্তিত | কিছুই ধরা হয় না |
| `CONFIRMED` | ফোনে নিশ্চিত · এখনো Reserved | কিছুই ধরা হয় না |
| `SHIPPED` | On hand ও Reserved কমে · লেজারে SALE লেখা হয় | কিছুই ধরা হয় না |
| ✅ `DELIVERED` | মাল চিরতরে গেল | **আয় ও COGS এখানে ধরা হয়** |
| ↩️ `RETURNED` | অক্ষত হলে ফেরত · নষ্ট হলে ক্ষতি | **আয় ফেরত যায়** |

### ছবিটি যা বলছে

- উপরের সারি — স্টকে কী হয়। নিচের সারি — হিসাবের খাতায় কী হয়।
- খেয়াল করুন, **প্রথম তিন ধাপে হিসাবের খাতায় কিছুই হয় না।**
- **DELIVERED** — এখানেই আয় আর পণ্যের খরচ (COGS) দুটোই ধরা হয়।
- ফেরত এলে আয় ফিরে যায়; মাল অক্ষত থাকলে স্টকে ফেরে, নষ্ট হলে লোকসান।

**Screens:** `/admin/orders` (অর্ডার তালিকা) · `/admin/returns` (ফেরত অনুরোধ)

---

# ধাপ ০৬ — একটি বিক্রিতে লাভ আসলে কত
*(একটি অর্ডার · Unit economics)*

১,২০০ টাকায় বিক্রি হলো মানে ১,২০০ টাকা লাভ নয়। প্রতিটি খরচ ওই টাকার ভেতর থেকেই কাটা যায় — যা পড়ে থাকে সেটাই আপনার।

### 🖼️ Diagram 7 — এক অর্ডারের ঝরনা (waterfall)
*"এক অর্ডারের বিক্রয়মূল্য থেকে খরচ বাদ দিয়ে নিট লাভ" — legend: ⚫ যা এল · 🔴 যা কাটা গেল · 🟢 যা থেকে গেল*

| স্তম্ভ | ধরন | টাকা | চলমান অবশিষ্ট |
| --- | --- | ---: | ---: |
| বিক্রয়মূল্য | ⚫ যা এল | ৳১,২০০ | ৳১,২০০ |
| পণ্যের খরচ (আসল খরচ) | 🔴 যা কাটা গেল | − ৳৮৬৫ | ৳৩৩৫ |
| কুরিয়ার খরচ | 🔴 যা কাটা গেল | − ৳১২০ | ৳২১৫ |
| প্যাকেজিং | 🔴 যা কাটা গেল | − ৳৩০ | ৳১৮৫ |
| বিজ্ঞাপনের ভাগ | 🔴 যা কাটা গেল | − ৳৯০ | ৳৯৫ |
| **নিট লাভ এই অর্ডারে** | 🟢 যা থেকে গেল | **৳৯৫** | **৳৯৫** |

### ছবিটি যা বলছে

- বিক্রয়মূল্য ৳১,২০০ দিয়ে শুরু।
- পণ্যের আসল খরচ ৳৮৬৫ — সবচেয়ে বড় কামড় এটাই।
- কুরিয়ার, প্যাকেজিং আর বিজ্ঞাপন মিলে আরও ৳২৪০।
- হাতে থাকে ৳৯৫ — বিক্রয়মূল্যের প্রায় **আট ভাগ** (৭.৯%)।

> ⚠️ একটা পিসে ৳৯৫ লাভ মানে একটা ফেরত অর্ডারের ক্ষতি পোষাতে প্রায় **১৩টি সফল অর্ডার** লাগে। এই কারণেই ফেরতের হার কমানো বাড়তি ছাড় দেওয়ার চেয়ে বেশি লাভজনক।

---

# ধাপ ০৭ — পুরো মাসের লাভ-লোকসান
*(মাস শেষে · Monthly P&L)*

উপরের এক অর্ডারের হিসাবটাই মাসের সব অর্ডারের জন্য একসাথে করলে যা দাঁড়ায় — এটিই **Profit & Loss** রিপোর্ট। বাঁ দিক থেকে ডান দিকে পড়ুন, প্রতিটি লাল স্তম্ভ একেকটি কামড়।

### 🖼️ Diagram 8 — আগস্ট ২০২৬ · ২১৪টি ডেলিভারি, ৯টি ফেরত
*Monthly P&L waterfall. Legend: ⚫ মোট বিক্রি · 🔴 খরচ ও বাদ · ⬛ উপ-মোট · 🟢 নিট লাভ*

| স্তম্ভ | ধরন | টাকা |
| --- | --- | ---: |
| মোট বিক্রি | ⚫ শুরু | ৳৪,৮৬,৩০০ |
| কুপন ছাড় | 🔴 বাদ | − ৳১৮,৪০০ |
| ফেরত | 🔴 বাদ | − ৳২১,৯০০ |
| **নিট আয়** | ⬛ উপ-মোট | **৳৪,৪৬,০০০** |
| পণ্যের খরচ (COGS) | 🔴 বাদ | − ৳২,৮১,০০০ |
| **মোট লাভ** | ⬛ উপ-মোট | **৳১,৬৫,০০০** |
| পরিচালন খরচ | 🔴 বাদ | − ৳১,২৯,৬২০ |
| **নিট লাভ** | 🟢 চূড়ান্ত | **৳৩৫,৩৮০** |

### ছবিটি যা বলছে

- এই মাসে ডেলিভারি হওয়া পণ্যের মূল্য ৳৪,৮৬,৩০০।
- কুপন ছাড় ও ফেরত বাদ দিয়ে নিট আয় ৳৪,৪৬,০০০।
- পণ্যের খরচ (COGS) ৳২,৮১,০০০ বাদ দিলে মোট লাভ ৳১,৬৫,০০০।
- কুরিয়ার, বিজ্ঞাপন, বেতন, ভাড়া — সব পরিচালন খরচ ৳১,২৯,৬২০ বাদে নিট লাভ ৳৩৫,৩৮০।

> ⚠️ ভাড়া, বেতন আর বিজ্ঞাপনের খরচ প্যানেল নিজে থেকে জানে না — **আপনাকে লিখে দিতে হয়**। না লিখলে ওই টাকাটা লাভ হিসেবে দেখাবে, আর আপনি ভাববেন ব্যবসা যা করছে তার চেয়ে ভালো করছে।

**Screens:** `/admin/reports/finance` · `/admin/reports/finance/expenses/new` · `/admin/reports/finance/ad-spend/new`

---

# ধাপ ০৮ — লাভ আর হাতের টাকা এক জিনিস নয়
*(শেষ কথা · Profit ≠ cash)*

মাস শেষে ৳৩৫,৩৮০ লাভ দেখাচ্ছে, অথচ ক্যাশবাক্স খালি — এটা ভুল হিসাব নয়। লাভটা পণ্য হয়ে গুদামে বসে আছে। এই পার্থক্যটাই **Cash Flow** রিপোর্ট দেখায়।

### 🖼️ Diagram 9 — একই মাস · খাতার লাভ বনাম হাতের টাকা
*"লাভ থেকে নতুন স্টক কেনার পর হাতে যা থাকে" — a short waterfall.*

| স্তম্ভ | ধরন | টাকা |
| --- | --- | ---: |
| খাতার নিট লাভ | ⚫ শুরু | ৳৩৫,৩৮০ |
| নতুন স্টক কেনা হলো | 🔴 বাদ | − ৳৮০,০০০ |
| **হাতের টাকা কমল** | 🟢 চূড়ান্ত | **− ৳৪৪,৬২০** |

### ছবিটি যা বলছে

- খাতায় নিট লাভ ৳৩৫,৩৮০।
- কিন্তু এই মাসেই নতুন স্টক কিনতে গেছে ৳৮০,০০০।
- ফলে হাতের টাকা কমেছে ৳৪৪,৬২০ — লাভ করেও।
- টাকাটা হারায়নি; সেটা এখন গুদামে পণ্য হয়ে আছে, বিক্রি হলে আবার ফিরবে।

**Screens:** `/admin/reports/cashflow` (ক্যাশ ফ্লো) · `/admin/reports/suppliers` (সাপ্লায়ারভিত্তিক লাভ)

---

## ⚠️ সতর্কতা — চারটি ভুল, যা উপরের সব হিসাব চুপচাপ নষ্ট করে দেয়

এই ভুলগুলোর কোনোটিই কোনো এরর দেখায় না। রিপোর্ট ঠিকঠাক চলতে থাকে, শুধু সংখ্যাগুলো আর সত্যি থাকে না।

| যে ভুলটি হয় | যা ঘটে | যা করা উচিত |
| --- | --- | --- |
| PO না লিখে হাতে স্টক বাড়ানো | পণ্যের খরচ শূন্য ধরা হয় — প্রতিটি বিক্রি পুরোটাই লাভ দেখায় | প্রতিটি চালান PO দিয়ে রিসিভ করুন |
| PO-তে ভাড়া না লেখা | প্রতি পিসে লাভ বাস্তবের চেয়ে বেশি দেখায় | Freight ও Customs ঘর দুটো পূরণ করুন |
| দেরিতে Delivered চিহ্ন দেওয়া | বিক্রি ভুল মাসের খাতায় চলে যায় | কুরিয়ার নিশ্চিত করলেই চিহ্ন দিন |
| নষ্ট মালকে Adjustment লেখা | সত্যিকারের লোকসান হিসাব থেকে অদৃশ্য হয়ে যায় | নষ্ট হলে Damage, গণনার ভুল হলে Adjustment |

---

## এবার হাতে-কলমে করতে চান?

লিখিত কর্মপদ্ধতিতে প্রতিটি ধাপের ফর্ম, ফিল্ড আর বাটনের নাম ধরে ধরে দেওয়া আছে — সাপ্লায়ার যোগ করা থেকে মাসের খরচ লেখা পর্যন্ত।

- লিখিত কর্মপদ্ধতি — `/admin/guide`
- স্টক তালিকা — `/admin/inventory`
- লাভ-লোকসান রিপোর্ট — `/admin/reports/finance`

---

## Appendix — the single example, end to end

For quick reference, here is the whole worked example condensed into one chain. Every number below appears in one of the nine diagrams above.

| Stage | Figure | Note |
| --- | ---: | --- |
| Supplier's goods price on PO-0042 | ৳১,০৯,০০০ | ১৫০ pieces across 3 lines |
| Freight + customs on the same PO | ৳৬,০০০ | allocated by value |
| **Total capital locked into the shipment** | **৳১,১৫,০০০** | becomes stock on receiving |
| Landed cost per punjabi | ৳৮৬৫ | ৳৮২০ + ৳৪৫ freight share |
| Selling price per punjabi | ৳১,২০০ | customer-facing `Price` |
| Gross margin per punjabi | ৳৩৩৫ | ৳১,২০০ − ৳৮৬৫ |
| Other per-order costs | ৳২৪০ | courier ৳১২০ + packaging ৳৩০ + ads ৳৯০ |
| **Net profit per delivered order** | **৳৯৫** | ~৭.৯% of the selling price |
| Month's delivered sales | ৳৪,৮৬,৩০০ | ২১৪ deliveries, ৯ returns |
| Month's net revenue | ৳৪,৪৬,০০০ | after coupons ৳১৮,৪০০ and returns ৳২১,৯০০ |
| Month's COGS | ৳২,৮১,০০০ | landed cost of delivered goods |
| Month's gross profit | ৳১,৬৫,০০০ | |
| Month's operating expenses | ৳১,২৯,৬২০ | courier, ads, salary, packaging, COD fees, damage |
| **Month's net profit** | **৳৩৫,৩৮০** | the P&L bottom line |
| New stock purchased that month | ৳৮০,০০০ | cash out, not an expense |
| **Change in cash on hand** | **− ৳৪৪,৬২০** | profitable month, negative cash |

---

## Glossary — Bangla ⇄ English

| Bangla | English |
| --- | --- |
| ক্রয় আদেশ | Purchase Order (PO) |
| চালান | Shipment / consignment |
| সাপ্লায়ারের দাম | Supplier unit cost |
| ভাড়া ও কাস্টমস | Freight & customs |
| আসল খরচ | Landed cost (stored as `Sourcing cost`) |
| গুদাম | Warehouse |
| স্টক | Stock / inventory |
| পণ্য লাইভ করা | Publishing a product (Draft → Active) |
| বিক্রয়মূল্য | Selling price |
| কুরিয়ার খরচ | Courier / shipping cost |
| প্যাকেজিং | Packaging |
| বিজ্ঞাপনের ভাগ | Allocated ad spend |
| কুপন ছাড় | Coupon discount |
| ফেরত | Return |
| পণ্যের খরচ / COGS | Cost of Goods Sold |
| নিট আয় | Net revenue |
| মোট লাভ | Gross profit |
| পরিচালন খরচ | Operating expenses |
| নিট লাভ | Net profit |
| হাতের টাকা | Cash on hand |
| ক্যাশ অন ডেলিভারি (COD) | Cash on Delivery |
| ঝরনা (চিত্র) | Waterfall chart |
