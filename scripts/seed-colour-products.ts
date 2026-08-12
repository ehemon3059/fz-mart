/**
 * One-off seeder: two COLORS-type demo products (Bags, Watches).
 *
 * Goes through the admin createProduct() rather than raw Prisma so slugging,
 * defaults and cache invalidation match a real admin save. Idempotent: skips a
 * product whose slug already exists.
 *
 *   npx tsx --env-file=.env scripts/seed-colour-products.ts
 */
import { prisma } from "../src/lib/prisma";
import { createProduct, type ProductInput } from "../src/server/products/admin";

/** Taka → paisa, the unit every money column is stored in. */
const TK = (taka: number) => Math.round(taka * 100);

const BAGS_CATEGORY = "bags";
const WATCHES_CATEGORY = "watches";

/** Colour-only variant: size stays null, colorName points at a ProductColor. */
function colourVariant(
  colorName: string,
  price: number,
  discountPrice: number | null,
  stock: number,
  sku: string,
) {
  return { size: null, colorName, price, discountPrice, stock, sku };
}

async function main() {
  const bags = await prisma.category.findUnique({ where: { slug: BAGS_CATEGORY } });
  const watches = await prisma.category.findUnique({ where: { slug: WATCHES_CATEGORY } });
  if (!bags) throw new Error(`Category "${BAGS_CATEGORY}" not found.`);
  if (!watches) throw new Error(`Category "${WATCHES_CATEGORY}" not found.`);

  const products: ProductInput[] = [
    // ── 1 · Bags ────────────────────────────────────────────────
    {
      name: "Nova Anti-Theft Laptop Backpack",
      categoryId: bags.id,
      description:
        "A water-resistant everyday backpack built around a 15.6\" padded laptop sleeve. " +
        "The hidden back-panel zip keeps your wallet and passport against your spine, and " +
        "the side USB port charges your phone from a power bank tucked in the inner pocket. " +
        "Breathable air-mesh straps and a luggage pass-through make it as comfortable on a " +
        "commute as it is on a flight.",
      price: TK(3200),
      discountPrice: TK(2450),
      purchaseCost: TK(1650),
      stock: 0, // colour variants below are authoritative
      lowStockThreshold: 5,
      isFeatured: true,
      promoBadge: "Best Seller",
      offerText: "Eid Special — free rain cover with every backpack",
      baseSku: "NOVA-BP",
      metaTitle: "Nova Anti-Theft Laptop Backpack — Water Resistant 15.6\" Bag",
      metaDescription:
        "Anti-theft backpack with hidden zip pocket, USB charging port and a padded 15.6-inch laptop sleeve. Available in four colours.",
      colors: [
        { name: "Midnight Black", hexCode: "#1c1c1e" },
        { name: "Charcoal Grey", hexCode: "#5a5f66" },
        { name: "Navy Blue", hexCode: "#1f3a63" },
        { name: "Olive Green", hexCode: "#5d6b3f" },
      ],
      variants: [
        colourVariant("Midnight Black", TK(3200), TK(2450), 24, "NOVA-BP-BLK"),
        colourVariant("Charcoal Grey", TK(3200), TK(2450), 15, "NOVA-BP-GRY"),
        colourVariant("Navy Blue", TK(3200), TK(2550), 11, "NOVA-BP-NVY"),
        colourVariant("Olive Green", TK(3350), null, 6, "NOVA-BP-OLV"),
      ],
      features: [
        "Hidden anti-theft zip pocket on the back panel",
        "Padded sleeve fits laptops up to 15.6 inches",
        "External USB charging port (power bank not included)",
        "Water-resistant 900D polyester with YKK zippers",
        "Luggage strap slides over a trolley handle",
      ],
      specifications: [
        { label: "Material", value: "900D water-resistant polyester" },
        { label: "Capacity", value: "28 litres" },
        { label: "Laptop compartment", value: "Up to 15.6 inches" },
        { label: "Dimensions", value: "46 × 32 × 18 cm" },
        { label: "Weight", value: "880 g" },
        { label: "Warranty", value: "6 months against manufacturing defects" },
      ],
      accordionSections: [
        {
          title: "What's in the box",
          icon: "📦",
          content: "- 1 × Nova backpack\n- 1 × Rain cover\n- 1 × Internal USB connector cable",
          isOpen: true,
        },
        {
          title: "Care instructions",
          icon: "🧼",
          content:
            "Spot-clean with a damp cloth and mild soap. Do not machine wash or tumble dry. " +
            "Air-dry away from direct sunlight to protect the coating.",
        },
      ],
    },

    // ── 2 · Watches ─────────────────────────────────────────────
    {
      name: "Orbit Classic Stainless Steel Watch",
      categoryId: watches.id,
      description:
        "A slim 40 mm dress watch that reads clearly at a glance: applied hour markers, a " +
        "sweeping second hand and a date window at three o'clock. The Japanese quartz " +
        "movement keeps ±20 s/month, the sapphire-coated glass shrugs off desk knocks, and " +
        "the quick-release strap swaps between steel mesh and leather without a tool.",
      price: TK(4500),
      discountPrice: TK(3390),
      purchaseCost: TK(2100),
      stock: 0, // colour variants below are authoritative
      lowStockThreshold: 3,
      isFeatured: true,
      promoBadge: "New Arrival",
      baseSku: "ORB-CL",
      metaTitle: "Orbit Classic Stainless Steel Watch — 40mm Japanese Quartz",
      metaDescription:
        "Slim 40mm quartz dress watch with sapphire-coated glass, 5 ATM water resistance and quick-release straps. Three finishes.",
      colors: [
        { name: "Silver / White Dial", hexCode: "#c8ccd0" },
        { name: "Gold / Black Dial", hexCode: "#b8912f" },
        { name: "Rose Gold / Blue Dial", hexCode: "#b76e79" },
      ],
      variants: [
        colourVariant("Silver / White Dial", TK(4500), TK(3390), 18, "ORB-CL-SLV"),
        colourVariant("Gold / Black Dial", TK(4800), TK(3690), 9, "ORB-CL-GLD"),
        colourVariant("Rose Gold / Blue Dial", TK(4800), null, 4, "ORB-CL-RSG"),
      ],
      features: [
        "40 mm stainless steel case, only 8 mm thick",
        "Japanese quartz movement, accurate to ±20 seconds per month",
        "Sapphire-coated mineral glass resists scratches",
        "5 ATM water resistant — safe for handwashing and rain",
        "Quick-release strap changes without tools",
      ],
      specifications: [
        { label: "Case diameter", value: "40 mm" },
        { label: "Case thickness", value: "8 mm" },
        { label: "Movement", value: "Japanese quartz (SR626SW battery)" },
        { label: "Glass", value: "Sapphire-coated mineral" },
        { label: "Water resistance", value: "5 ATM (50 m)" },
        { label: "Strap width", value: "20 mm, quick-release" },
        { label: "Warranty", value: "12 months on the movement" },
      ],
      accordionSections: [
        {
          title: "What's in the box",
          icon: "📦",
          content: "- 1 × Orbit Classic watch\n- 1 × Gift box\n- 1 × Warranty card\n- 1 × Strap adjustment pin",
          isOpen: true,
        },
        {
          title: "Water resistance guide",
          icon: "💧",
          content:
            "5 ATM covers splashes, handwashing and rain. It is **not** rated for swimming, " +
            "diving or hot showers — steam degrades the seals.",
        },
      ],
    },
  ];

  for (const input of products) {
    const existing = await prisma.product.findFirst({
      where: { name: input.name },
      select: { id: true, slug: true },
    });
    if (existing) {
      console.log(`↷ Skipped "${input.name}" — already exists (id ${existing.id}, /${existing.slug}).`);
      continue;
    }
    const created = await createProduct(input);
    console.log(
      `✅ Created "${created.name}" (id ${created.id}) → /products/${created.slug}` +
        `  [${input.variants?.length ?? 0} colour variants]`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
