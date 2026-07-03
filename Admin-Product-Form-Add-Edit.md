# FZ-Mart Admin — Product Form (Add/Edit)

Modern, responsive Add/Edit Product form for FZ-Mart admin dashboard.

## File Structure

```
src/
├── types/
│   ├── product.ts          # Product interface
│   └── category.ts         # Category & subcategory types
├── lib/
│   ├── categories/
│   │   └── data.ts         # Mock category data
│   └── products/
│       └── data.ts         # Mock product data + utils
├── components/
│   ├── icons.tsx           # Icon components
│   ├── admin/
│   │   ├── AdminSidebar.tsx
│   │   └── products/
│   │       └── ProductForm.tsx    # Main form component
│   └── ui/
│       ├── input.tsx       # Reusable input
│       └── textarea.tsx    # Reusable textarea
└── app/(admin)/admin/(protected)/products/
    ├── page.tsx            # Products list
    ├── new/
    │   └── page.tsx        # New product page
    └── [id]/edit/
        └── page.tsx        # Edit product page
```

## Features

✓ **Dual-mode form** — New product (empty) and Edit product (pre-filled)
✓ **Two-column layout** — Left: basic info, pricing, stock; Right: images, tags, SEO
✓ **Image management** — Upload thumbnails + gallery with preview, reorder, delete
✓ **Rich text editor** — Description & short description with formatting
✓ **Category + subcategory** — Dependent dropdowns
✓ **Pricing variants** — Base price, discount %, discount price, cost
✓ **Stock tracking** — Current stock + low-stock threshold + status badge
✓ **Tags & SEO** — Slug auto-generation, meta description, keywords
✓ **Validation** — Client-side form validation with error messages
✓ **Responsive** — Mobile-optimized form layout
✓ **Dark/light ready** — Works with Tailwind dark mode

## Setup

1. **Copy `src/` into your Next.js project** (merge with existing)

2. **Update data sources** — Replace mock data in `src/lib/`:
   ```tsx
   // src/lib/products/data.ts
   // Replace:
   export async function listAllProducts() { return MOCK_PRODUCTS; }
   // With:
   export async function listAllProducts() {
     const res = await db.product.findMany();
     return res;
   }
   ```

3. **Wire server actions** — Open `src/app/(admin)/admin/(protected)/products/actions.ts`:
   ```tsx
   export async function createProduct(formData: FormData) {
     // TODO: call your DB
     // const product = await db.product.create({ ... });
     // revalidatePath('/admin/products');
     // redirect(`/admin/products/${product.id}/edit`);
   }
   ```

4. **Configure Tailwind** (already included from Pages/Categories):
   ```js
   // tailwind.config.ts
   theme: {
     colors: {
       brand: { 600: '#10b981', 700: '#059669' }, // emerald
     },
     fontFamily: {
       sans: ['Manrope', 'sans-serif'],
     },
   }
   ```

5. **Add fonts** in `app/layout.tsx`:
   ```tsx
   import { Manrope } from 'next/font/google';
   const manrope = Manrope({ subsets: ['latin'] });
   ```

## Usage

### New Product Page
```tsx
// /admin/products/new
// Shows empty form, Save creates product, redirects to edit
```

### Edit Product Page
```tsx
// /admin/products/[id]/edit
// Shows pre-filled form, Save updates product
```

### Form Component (Standalone)
```tsx
import { ProductForm } from '@/components/admin/products/ProductForm';
import { listAllSubcategories } from '@/lib/categories/data';

const subcats = await listAllSubcategories();
<ProductForm subcategories={subcats} product={existingProduct} />
```

## Customization

**Change brand color:**
```tsx
// ProductForm.tsx line ~50
className="bg-brand-600 hover:bg-brand-700"
// Update tailwind.config.ts theme.colors.brand
```

**Add/remove form sections:**
Open `ProductForm.tsx`, each section is a `<fieldset>` — add/remove as needed.

**Modify validation:**
```tsx
// ProductForm.tsx validateForm()
if (!values.name.trim()) {
  errors.name = 'Product name is required';
}
```

**Image upload behavior:**
Currently stores as data-URL. For production:
```tsx
// Replace uploadImage() with:
const formData = new FormData();
formData.append('file', file);
const res = await fetch('/api/upload', { method: 'POST', body: formData });
```

## Dependencies

- **Next.js 14+** (App Router, Server Components)
- **React 18+**
- **Tailwind CSS 3.4+**
- **TypeScript 5+**

No external UI libraries — all components are custom-built.

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile (iOS Safari 14+, Chrome Android)

## License

Part of FZ-Mart Admin Dashboard. Use freely within your project.
