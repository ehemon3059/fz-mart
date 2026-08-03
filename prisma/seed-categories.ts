/**
 * Seeds the 20 top-level departments, each with a matching icon key.
 *
 * Idempotent by slug: a category whose slug already exists is left untouched,
 * so re-running never duplicates and never overwrites an image the admin has
 * since uploaded. "Kitchen Accessories" already exists as a child of
 * Home & Life Style — it is skipped rather than promoted to a root, because
 * silently re-parenting a live category would move its products in the nav.
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
const CATEGORIES: { name: string; iconKey: string }[] = [
  { name: "Bags", iconKey: "bag" },
  { name: "Jewelry", iconKey: "jewelry" },
  { name: "Shoes", iconKey: "shoe" },
  { name: "Beauty", iconKey: "beauty" },
  { name: "Mens Wear", iconKey: "shirt" },
  { name: "Women Wear", iconKey: "dress" },
  { name: "Eyewear", iconKey: "eyewear" },
  { name: "Baby Items", iconKey: "baby" },
  { name: "Watches", iconKey: "watch" },
  { name: "Gadgets", iconKey: "gadget" },
  { name: "Kitchen Accessories", iconKey: "kitchen" },
  { name: "Home Decoration", iconKey: "homeDecor" },
  { name: "Bedding Accessories", iconKey: "bedding" },
  { name: "Bathroom Counter Storage", iconKey: "bathroom" },
  { name: "Mother & Baby", iconKey: "mother" },
  { name: "Groceries", iconKey: "groceries" },
  { name: "Health", iconKey: "health" },
  { name: "Toys", iconKey: "toys" },
  { name: "Gifts & Craft", iconKey: "gift" },
  { name: "Tools & Hardware", iconKey: "tools" },
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
      },
    });
    console.log(`created ${cat.name} (id ${row.id}, icon ${cat.iconKey})`);
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
