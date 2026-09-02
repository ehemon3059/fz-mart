import { PrismaClient } from "@prisma/client";
import { getProductById, updateProduct } from "./src/server/products/admin";

const p = new PrismaClient();
const id = 1230002;
const before = await getProductById(id);
if (!before) throw new Error("gone");

// Resubmit EXACTLY what is stored — the worst case for the old code (every row
// matched, so every row got a redundant update) and a no-op for the new one.
const input = {
  name: before.name,
  categoryId: before.categoryId,
  description: before.description ?? "",
  price: before.price,
  discountPrice: before.discountPrice,
  stock: 0,
  lowStockThreshold: before.lowStockThreshold,
  showStock: before.showStock,
  priceColor: before.priceColor,
  isFeatured: before.isFeatured,
  status: before.status,
  promoBadge: before.promoBadge,
  offerText: before.offerText,
  metaTitle: before.metaTitle,
  metaDescription: before.metaDescription,
  sizeGuideId: before.sizeGuideId,
  sizeLabel: before.sizeLabel,
  sizeChart: before.sizeChart,
  baseSku: before.baseSku,
  images: before.images.map((i) => ({ url: i.url, variantLabel: i.variantLabel })),
  colors: before.colors.map((c) => ({ name: c.name, hexCode: c.hexCode, imageUrl: c.imageUrl })),
  variants: before.variants.map((v) => ({
    size: v.size, colorName: v.colorName, price: v.price, discountPrice: v.discountPrice,
    stock: v.stock, showStock: v.showStock, priceColor: v.priceColor,
    imageUrl: v.imageUrl, sku: v.sku,
  })),
  accordionSections: before.accordionSections.map((a) => ({
    title: a.title, icon: a.icon, content: a.content, isOpen: a.isOpen,
  })),
};

const t0 = Date.now();
await updateProduct(id, input as never, "timing-test");
console.log("updateProduct OK in", Date.now() - t0, "ms");

const after = await getProductById(id);
console.log("variants before/after:", before.variants.length, "/", after!.variants.length);
console.log("ids preserved:", JSON.stringify(before.variants.map(v=>v.id)) === JSON.stringify(after!.variants.map(v=>v.id)));
console.log("stock preserved:", JSON.stringify(before.variants.map(v=>v.stock)) === JSON.stringify(after!.variants.map(v=>v.stock)));
console.log("purchaseCost preserved:", JSON.stringify(before.variants.map(v=>v.purchaseCost)) === JSON.stringify(after!.variants.map(v=>v.purchaseCost)));
await p.$disconnect();
