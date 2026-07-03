# FZ-Mart Homepage — Next.js TSX Component

Modern, mobile-first e-commerce homepage for FZ Mart (Bangladeshi online grocery + general store).

## File Structure

```
src/
├── types/
│   ├── product.ts
│   └── category.ts
├── lib/
│   ├── products/
│   │   └── data.ts
│   └── categories/
│       └── data.ts
├── components/
│   ├── icons.tsx
│   ├── home/
│   │   ├── HeroSection.tsx
│   │   ├── TrustStrip.tsx
│   │   ├── CategoryGrid.tsx
│   │   ├── FlashSaleSection.tsx
│   │   ├── ProductRow.tsx
│   │   ├── SocialProof.tsx
│   │   ├── NewsletterSignup.tsx
│   │   └── Footer.tsx
│   └── ui/
│       ├── ProductCard.tsx
│       ├── CountdownTimer.tsx
│       └── CarouselBanner.tsx
└── app/
    ├── layout.tsx
    └── page.tsx
```

## Brand System (Exact)

- **Primary accent (fuchsia):** `#c026d3`
- **Accent dark (hover):** `#a21caf`
- **Accent soft (bg):** `#fbe9fe`
- **Accent tint (borders):** `#f3c4f9`
- **Sale color (rose):** `#e11d48`
- **Ink (text):** `#23211e`
- **Soft text:** `#5c5852`
- **Background:** `#fafaf9`
- **Cards:** `#ffffff`
- **Borders:** `#ecebe8`
- **Font:** Manrope (headings + body)
- **Radius:** 14px

## Features

✓ **Mobile-first responsive design** — optimized for small screens first, scales up
✓ **Hero carousel** — auto-rotating banner with dot indicators (functional)
✓ **Trust strip** — 4 icons with labels (COD, free shipping, returns, authenticity)
✓ **Category grid** — visual tiles with icons
✓ **Flash sale section** — live countdown timer + discounted products
✓ **Product rows** — "New Arrivals", "Best Sellers" (with rank badges), "Featured"
✓ **Social proof** — star rating + customer review quotes
✓ **Newsletter signup** — fuchsia band with email + WhatsApp options
✓ **Footer** — links, payment info, contact details
✓ **No external frameworks** — custom CSS, no Tailwind (can add if preferred)

## Setup

1. **Copy `src/` into your Next.js project** (merge with existing)

2. **Install Manrope font** in `app/layout.tsx`:
   ```tsx
   import { Manrope } from 'next/font/google';
   const manrope = Manrope({ subsets: ['latin'] });
   ```

3. **Create `globals.css`** (if not present):
   ```css
   * { margin: 0; padding: 0; box-sizing: border-box; }
   body { font-family: Manrope, sans-serif; background: #fafaf9; color: #23211e; }
   ```

4. **Update data sources** — Replace mock data in `src/lib/`:
   ```tsx
   // src/lib/products/data.ts
   export async function getFeaturedProducts() {
     // Replace with DB call
     return MOCK_FEATURED_PRODUCTS;
   }
   ```

## Customization

**Change colors:**
All color values are inline CSS — search for `#c026d3`, `#e11d48`, etc. in components and update.

**Adjust hero carousel rotation speed:**
In `HeroSection.tsx`, change `useEffect` interval from `5000` (5 seconds) to your preference.

**Modify product row count:**
In `ProductRow.tsx`, adjust `grid-cols-2` (mobile) / `grid-cols-4` (desktop) and `.slice(0, 12)` limit.

**Add real images:**
Replace placeholder `backgroundColor` divs with `<img src="…" alt="…">` tags.

## Dependencies

- **Next.js 14+** (App Router)
- **React 18+**
- **TypeScript 5+**

No external UI libraries — pure CSS Grid/Flexbox.

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile (iOS Safari 14+, Chrome Android)

## License

Part of FZ-Mart. Use freely within your project.
