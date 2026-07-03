import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

// Seed minimal, realistic demo data so `npm run dev` shows a populated
// storefront and you can log into admin immediately.
//
// Idempotent: uses upserts keyed on unique fields, so re-running won't
// duplicate rows.

const prisma = new PrismaClient();

// Prices are integers in paisa (1 BDT = 100 paisa) to avoid float rounding.
const TK = (taka: number) => Math.round(taka * 100);

async function main() {
  // ── Admin user ────────────────────────────────────────────
  const adminPassword = "admin123"; // ⚠️  change after first login
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const adminEmail = "no.one3059@gmail.com"; // recovery address for password resets
  await prisma.adminUser.upsert({
    where: { username: "admin" },
    // Backfill the recovery email on existing installs too, so forgot-password works.
    update: { email: adminEmail },
    create: { username: "admin", email: adminEmail, passwordHash, role: "OWNER" },
  });

  // ── Shipping zones ────────────────────────────────────────
  const insideDhaka = await prisma.shippingZone.upsert({
    where: { id: 1 },
    update: { name: "Inside Dhaka", charge: TK(60) },
    create: { id: 1, name: "Inside Dhaka", charge: TK(60), sortOrder: 0 },
  });
  await prisma.shippingZone.upsert({
    where: { id: 2 },
    update: { name: "Outside Dhaka", charge: TK(120) },
    create: { id: 2, name: "Outside Dhaka", charge: TK(120), sortOrder: 1 },
  });

  // ── Catalog: Category → Subcategory → Products ────────────
  const electronics = await prisma.category.upsert({
    where: { slug: "electronics" },
    update: {},
    create: { name: "Electronics", slug: "electronics", sortOrder: 0 },
  });

  const accessories = await prisma.subcategory.upsert({
    where: { slug: "accessories" },
    update: {},
    create: {
      name: "Accessories",
      slug: "accessories",
      categoryId: electronics.id,
      sortOrder: 0,
    },
  });

  const products = [
    {
      name: "Wireless Earbuds",
      slug: "wireless-earbuds",
      description: "Bluetooth 5.3 earbuds with charging case.",
      price: TK(1500),
      discountPrice: TK(1199),
      stock: 50,
      isFeatured: true,
      promoBadge: "Best Seller",
    },
    {
      name: "USB-C Fast Charger",
      slug: "usb-c-fast-charger",
      description: "20W PD fast charger, compact design.",
      price: TK(800),
      discountPrice: null,
      stock: 120,
      isFeatured: true,
      promoBadge: null,
    },
    {
      name: "Braided USB-C Cable",
      slug: "braided-usb-c-cable",
      description: "1m durable braided cable, 60W rated.",
      price: TK(350),
      discountPrice: TK(299),
      stock: 0, // out of stock — exercises the stock-status UI
      isFeatured: false,
      promoBadge: null,
    },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        price: p.price,
        discountPrice: p.discountPrice,
        stock: p.stock,
      },
      create: {
        ...p,
        subcategoryId: accessories.id,
      },
    });

    // One placeholder primary image per product (idempotent-ish: only add if none).
    const existing = await prisma.productImage.count({
      where: { productId: product.id },
    });
    if (existing === 0) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: `/placeholder.svg`,
          isPrimary: true,
          sortOrder: 0,
        },
      });
    }
  }

  // ── Footer/legal/support pages ─────────────────────────────
  const pages = [
    { slug: "about-us", title: "About Us", content: "Tell customers about Ghorer Bazar here." },
    { slug: "contact-us", title: "Contact Us", content: "Add contact details here." },
    { slug: "company-information", title: "Company Information", content: "Add company registration details here." },
    { slug: "terms-and-conditions", title: "Terms & Conditions", content: "Add your store's terms and conditions here." },
    { slug: "privacy-policy", title: "Privacy Policy", content: "Add your privacy policy here." },
    { slug: "support-center", title: "Support Center", content: "Add support center information here." },
    { slug: "how-to-order", title: "How to Order", content: "Explain the ordering process here." },
    { slug: "order-tracking", title: "Order Tracking", content: "Explain how customers can track their order here." },
    { slug: "payment", title: "Payment", content: "Explain accepted payment methods here." },
    { slug: "shipping", title: "Shipping", content: "Explain shipping zones and delivery times here." },
    { slug: "happy-return", title: "Happy Return", content: "Explain your happy return policy here." },
    { slug: "refund-policy", title: "Refund Policy", content: "Explain your refund policy here." },
    { slug: "exchange", title: "Exchange", content: "Explain your exchange policy here." },
    { slug: "cancellation", title: "Cancellation", content: "Explain your cancellation policy here." },
    { slug: "pre-order", title: "Pre-Order", content: "Explain how pre-orders work here." },
    { slug: "extra-discount", title: "Extra Discount", content: "Explain extra discount offers here." },
  ];
  for (const p of pages) {
    await prisma.page.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
  }

  // ── FAQ ──────────────────────────────────────────────────────
  const faqs = [
    { question: "How do I place an order?", answer: "Add products to your cart and proceed to checkout." },
    { question: "Do you offer Cash on Delivery?", answer: "Yes, all orders are Cash on Delivery." },
    { question: "How can I track my order?", answer: "Use the order tracking page with your order number and phone." },
  ];
  for (let i = 0; i < faqs.length; i++) {
    const existing = await prisma.faqItem.findFirst({ where: { question: faqs[i].question } });
    if (!existing) {
      await prisma.faqItem.create({ data: { ...faqs[i], sortOrder: i } });
    }
  }

  // ── Homepage banner ───────────────────────────────────────
  const banners = await prisma.banner.count();
  if (banners === 0) {
    await prisma.banner.create({
      data: { imageUrl: "/placeholder.svg", link: "/category/electronics", sortOrder: 0 },
    });
  }

  console.log("✅ Seed complete.");
  console.log(`   Admin login → username: admin  password: ${adminPassword}`);
  console.log(`   Shipping zone ids: ${insideDhaka.id} (Inside Dhaka), 2 (Outside Dhaka)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
