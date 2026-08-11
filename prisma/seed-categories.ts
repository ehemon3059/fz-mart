/**
 * Seeds the top-level departments, each with a matching icon key and the
 * selling type its products default to.
 *
 * Idempotent by slug: a category whose slug already exists is left untouched,
 * so re-running never duplicates and never overwrites an image the admin has
 * since uploaded. "Kitchen Accessories" already exists as a child of
 * Home & Life Style — it is skipped rather than promoted to a root, because
 * silently re-parenting a live category would move its products in the nav.
 *
 * `defaultSellingType` is REQUIRED on every entry here because these are all
 * roots, and a root has nothing above it to inherit from — the admin forms
 * enforce the same rule. Seeding a root without one would leave the product
 * form unable to resolve a shape for anything filed under it.
 *
 * Three former entries ("Mens Wear", "Women Wear", "Mother & Baby") were
 * removed: they duplicated "Men's & Boy's Fashion", "Women's & Girl's Fashion"
 * and "Baby Items", which are the ones the catalogue actually uses. Leaving
 * them here would resurrect them on the next run.
 *
 * Run with:  npx tsx --env-file=.env prisma/seed-categories.ts
 */
import { PrismaClient } from "@prisma/client";
// The real slugify, not a copy — a divergent copy would compute different slugs
// from the admin UI and silently create duplicates on re-run.
import { slugify } from "../src/lib/slugify";

const prisma = new PrismaClient();

// sortOrder follows array order in tens, leaving gaps so the admin can slot a
// new department between two others without renumbering the rest.
type Selling = "SINGLE" | "COLORS" | "SIZES";

const CATEGORIES: { name: string; iconKey: string; selling: Selling }[] = [
  { name: "Bags", iconKey: "bag", selling: "COLORS" },
  // Necklaces and bangles go by colour; rings are the exception and override
  // the type on the product itself.
  { name: "Jewelry", iconKey: "jewelry", selling: "COLORS" },
  { name: "Shoes", iconKey: "shoe", selling: "SIZES" },
  // Skincare dominates here; lipstick and nail shades override per product.
  { name: "Beauty", iconKey: "beauty", selling: "SINGLE" },
  { name: "Eyewear", iconKey: "eyewear", selling: "COLORS" },
  // A container whose children each set their own type — this value only
  // covers products filed directly on the department itself.
  { name: "Baby Items", iconKey: "baby", selling: "SINGLE" },
  { name: "Watches", iconKey: "watch", selling: "COLORS" },
  { name: "Gadgets", iconKey: "gadget", selling: "SINGLE" },
  { name: "Kitchen Accessories", iconKey: "kitchen", selling: "SINGLE" },
  { name: "Home Decoration", iconKey: "homeDecor", selling: "SINGLE" },
  // Bedsheets run Single/Double/King, and in colours on top of that.
  { name: "Bedding Accessories", iconKey: "bedding", selling: "SIZES" },
  { name: "Bathroom Counter Storage", iconKey: "bathroom", selling: "SINGLE" },
  { name: "Groceries", iconKey: "groceries", selling: "SINGLE" },
  { name: "Health", iconKey: "health", selling: "SINGLE" },
  { name: "Toys", iconKey: "toys", selling: "SINGLE" },
  { name: "Gifts & Craft", iconKey: "gift", selling: "SINGLE" },
  { name: "Tools & Hardware", iconKey: "tools", selling: "SINGLE" },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const [i, cat] of CATEGORIES.entries()) {
    const slug = slugify(cat.name);
    const existing = await prisma.category.findUnique({ where: { slug } });

    if (existing) {
      console.log(`skip    ${cat.name} — slug "${slug}" already exists (id ${existing.id})`);
      skipped++;
      continue;
    }

    const row = await prisma.category.create({
      data: {
        name: cat.name,
        slug,
        parentId: null,
        iconKey: cat.iconKey,
        sortOrder: (i + 1) * 10,
        isActive: true,
        defaultSellingType: cat.selling,
      },
    });
    console.log(`created ${cat.name} (id ${row.id}, icon ${cat.iconKey}, ${cat.selling})`);
    created++;
  }

  console.log(`\nDone. ${created} created, ${skipped} skipped.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
