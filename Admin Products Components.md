# FZ-Mart — Admin Products Components

Drop-in Next.js 14 / App Router components for the admin **Products** management (list + add/edit form). Built with Tailwind CSS and TypeScript.

---

## What's included

```
src/
├── types/
│   ├── product.ts                                  — Product type
│   └── category.ts                                 — Subcategory type
├── lib/
│   ├── products/data.ts                            — Mock product data + getProductById / listAllProducts
│   └── categories/data.ts                          — listAllSubcategories (with parent category info)
├── components/
│   ├── icons.tsx                                   — Inline-SVG icon helper
│   └── admin/
│       ├── AdminSidebar.tsx                        — Left nav (Server Component)
│       └── products/
│           ├── badges.tsx                          — Thumb / PriceDisplay / StockDisplay / StatusPill / PromoBadge
│           ├── DeleteBtn.tsx                       — Two-step confirm delete (Client)
│           ├── StatsStrip.tsx                      — Total / Active / Out-of-stock cards
│           ├── SearchBar.tsx                       — Search + Active/All/Inactive filter (Client)
│           ├── ProductRow.tsx                      — Desktop table row
│           ├── ProductMobileCard.tsx               — Mobile card
│           ├── EmptyState.tsx                      — No-products empty state
│           ├── ProductsListClient.tsx              — Root list client (Client)
│           └── ProductForm.tsx                     — Add/Edit form (Client) — used by /new and /[id]/edit
└── app/
    └── (admin)/admin/(protected)/
        └── products/
            ├── page.tsx                            — /admin/products
            ├── actions.ts                          — saveProduct / removeProduct
            ├── new/page.tsx                        — /admin/products/new
            └── [id]/edit/page.tsx                  — /admin/products/[id]/edit
```

---

## Setup

### 1. Prerequisites — Tailwind tokens
If you've already installed the **FZ-Mart Pages** or **Categories** packages, your `tailwind.config.ts` already has the `brand` + `stone` palettes and Manrope font. Otherwise, see the Pages export's `tailwind.config.extend.ts`.

### 2. Replace mock data with real DB calls

**`src/lib/products/data.ts`** — swap the mock body for:
```ts
import { listAllProducts as dbList, getProductById as dbGet } from "@/server/products/admin";
export async function listAllProducts() { return dbList(); }
export async function getProductById(id: number) { return dbGet(id); }
```

**`src/lib/categories/data.ts`** — swap for:
```ts
import { listAllSubcategories as dbList } from "@/server/categories/admin";
export async function listAllSubcategories() { return dbList(); }
```

### 3. Wire up server actions
`actions.ts` has TODO comments — uncomment the real DB calls.

### 4. Copy files
Drop the `src/` tree into your project. The `AdminSidebar` and `icons.tsx` are shared with the Pages/Categories packages — keep one copy.

---

## Routes

| Route | Description |
|---|---|
| `/admin/products` | Products list (table on desktop, cards on mobile) |
| `/admin/products/new` | New product form |
| `/admin/products/[id]/edit` | Edit product form |

---

## Form features

- **Two-column desktop layout** — Basic info / Pricing / Images on the left; sticky Preview / Organization / Visibility / Promo badge on the right
- **Live storefront preview** — Updates as you type
- **Repeatable image URL list** with live thumbnail previews (broken-URL fallback to icon) and a hidden textarea that preserves the one-URL-per-line backend contract
- **Currency inputs** with ৳ prefix; values stored as paisa (×100) integers
- **Live -X% off** badge under discount price; inline red error if discount ≥ regular price
- **Stock = 0** warning; required-field validation; "Saving…" pending state
- **Mobile sticky save bar** at the bottom

---

## Money handling

Prices are stored as **paisa** (integer × 100) in line with the existing FZ-Mart backend. The form converts back and forth via `fmtTakaInput` / `parseTaka` helpers inside `ProductForm.tsx`. If your backend uses raw taka instead, change both helpers to identity functions.
