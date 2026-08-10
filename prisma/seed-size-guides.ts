import { PrismaClient } from "@prisma/client";

/**
 * The starter size guides — the three size sets this catalogue actually sells
 * in. Split out of seed.ts so it can be run on its own against a live database
 * (`npx tsx prisma/seed-size-guides.ts`) without also inserting demo products.
 *
 * Idempotent: keyed on fixed ids, matching how seed.ts seeds shipping zones.
 * Re-running restores the intended values and ORDER without duplicating rows —
 * order is the whole point of a guide, so the value rows are replaced wholesale
 * rather than merged.
 */

interface GuideSeed {
  id: number;
  name: string;
  sizeLabel: string | null;
  chart: string | null;
  values: string[];
}

const GUIDES: GuideSeed[] = [
  {
    id: 1,
    name: "Blouse / bust sizes",
    sizeLabel: "Bust Size",
    // Runs 32–38 in single steps, then even numbers only — the sequence is why
    // a guide exists instead of retyping sizes per product.
    values: ["32", "33", "34", "35", "36", "37", "38", "40", "42", "44", "46", "48", "50", "52"],
    chart: `| Bust Size | Bust (in) | Waist (in) | Shoulder (in) |
| --- | --- | --- | --- |
| **32** | 32 | 26 | 13 |
| **34** | 34 | 28 | 13.5 |
| **36** | 36 | 30 | 14 |
| **38** | 38 | 32 | 14.5 |
| **40** | 40 | 34 | 15 |

*Measurements are of the garment and may vary by ±0.5".*`,
  },
  {
    id: 2,
    name: "Apparel S–XXL",
    sizeLabel: null, // plain "Size"
    values: ["S", "M", "L", "XL", "XXL"],
    chart: `| Size | Chest (in) | Length (in) | Shoulder (in) |
| --- | --- | --- | --- |
| **S** | 38 | 26 | 16.5 |
| **M** | 40 | 27 | 17.5 |
| **L** | 42 | 28 | 18.5 |
| **XL** | 44 | 29 | 19.5 |
| **XXL** | 46 | 30 | 20.5 |

*Measurements are of the garment and may vary by ±0.5".*`,
  },
  {
    id: 3,
    name: "Panjabi 38–44",
    sizeLabel: null,
    values: ["38", "40", "42", "44"],
    chart: `| Size | Chest (in) | Length (in) | Sleeve (in) |
| --- | --- | --- | --- |
| **38** | 38 | 40 | 23 |
| **40** | 40 | 41 | 23.5 |
| **42** | 42 | 42 | 24 |
| **44** | 44 | 43 | 24.5 |

*Measurements are of the garment and may vary by ±0.5".*`,
  },
];

export async function seedSizeGuides(prisma: PrismaClient) {
  for (const g of GUIDES) {
    const data = { name: g.name, sizeLabel: g.sizeLabel, chart: g.chart, isActive: true };
    await prisma.sizeGuide.upsert({
      where: { id: g.id },
      update: data,
      create: { id: g.id, ...data },
    });
    // Replace the values: a guide's order is data, and merging would leave
    // stale sizes behind after an edit to this file.
    await prisma.sizeGuideValue.deleteMany({ where: { guideId: g.id } });
    await prisma.sizeGuideValue.createMany({
      data: g.values.map((value, i) => ({ guideId: g.id, value, sortOrder: i })),
    });
  }
  return GUIDES.length;
}

// Direct run: `npx tsx prisma/seed-size-guides.ts`
if (process.argv[1] && process.argv[1].includes("seed-size-guides")) {
  const prisma = new PrismaClient();
  seedSizeGuides(prisma)
    .then((n) => console.log(`Seeded ${n} size guides.`))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
