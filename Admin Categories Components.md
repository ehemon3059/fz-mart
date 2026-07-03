# FZ-Mart — Admin Categories Components

Drop-in Next.js 14 / App Router components for the admin **Categories** management page. Built with Tailwind CSS and TypeScript.

---

## What's included

```
src/
├── types/category.ts                              — Category & Subcategory types
├── lib/categories/data.ts                         — Mock data + listAllCategories / getCategoryById
├── components/
│   ├── icons.tsx                                  — Inline-SVG icon helper (same as Pages export)
│   ├── admin/
│   │   ├── AdminSidebar.tsx                       — Left nav (Server Component)
│   │   └── categories/
│   │       ├── InactiveBadge.tsx                  — "Inactive" pill badge
│   │       ├── SlugChip.tsx                       — Monospace /{slug} chip
│   │       ├── CountBadge.tsx                     — "N subcategories" count badge
│   │       ├── DeleteBtn.tsx                      — Two-step confirm delete button (Client)
│   │       ├── AddSubcategoryRow.tsx              — Inline add subcategory form (Client)
│   │       ├── SubcategoryRow.tsx                 — Single subcategory row
│   │       ├── CategoryCard.tsx                   — Category card with subcategory list
│   │       └── CategoriesClient.tsx               — Root client component (manages all state)
└── app/
    └── (admin)/admin/(protected)/
        └── categories/
            ├── page.tsx                           — /admin/categories (Server Component)
            └── actions.ts                         — Server actions (save / remove)
```

---

## Setup

### 1. Prerequisites
If you've already installed the **FZ-Mart Admin Pages** package, the Tailwind config and fonts are already set up. Skip to step 3.

### 2. Extend `tailwind.config.ts`
Add the brand token block from the Pages export (`tailwind.config.extend.ts`) if not already done.

### 3. Wire up the data layer
`src/lib/categories/data.ts` ships with a mock `listAllCategories()`. Replace it with your real DB call:
```ts
// swap the body with:
import { listAllCategories as dbList } from "@/server/categories/admin";
return await dbList();
```

### 4. Wire up server actions
`actions.ts` has TODO comments for each DB call. Uncomment and import from `@/server/categories/admin`.

### 5. Copy files
Copy the `src/` tree into your project. The admin layout (`AdminSidebar`) is shared with the Pages package — only copy it once.

---

## Routes

| Route | Description |
|---|---|
| `/admin/categories` | Categories list (this package) |
| `/admin/categories/new` | Create form — wire to `CategoryForm` from your existing code |
| `/admin/categories/[id]/edit` | Edit form — wire to `CategoryForm` |

---

## Interaction model

| Action | Mechanism |
|---|---|
| Delete category | Two-step confirm in `DeleteBtn` → calls `removeCategory` server action |
| Delete subcategory | Two-step confirm → calls `removeSubcategory` server action |
| Add subcategory | Inline form → calls `saveSubcategory` server action, optimistic update |
| Error display | Inline below the card header on failure |
