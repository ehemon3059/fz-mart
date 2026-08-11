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
  {
    id: 4,
    name: "Kids age 0–8 YRS",
    sizeLabel: "Age",
    // Months up to a year, then whole years — the jump is why this can't be a
    // plain numeric sort. Matches the "2 YRS / 4 YRS / 6 YRS" wording already
    // typed by hand on the baby products before guides were attached.
    values: ["0-3 M", "3-6 M", "6-12 M", "1 YR", "2 YRS", "3 YRS", "4 YRS", "6 YRS", "8 YRS"],
    chart: `| Age | Height (in) | Chest (in) | Length (in) |
| --- | --- | --- | --- |
| **0-3 M** | 21–24 | 16 | 10 |
| **3-6 M** | 24–26 | 17 | 11 |
| **6-12 M** | 26–29 | 18 | 12 |
| **1 YR** | 29–31 | 19 | 13 |
| **2 YRS** | 31–35 | 20 | 14 |
| **3 YRS** | 35–38 | 21 | 15 |
| **4 YRS** | 38–41 | 22 | 16 |
| **6 YRS** | 41–46 | 24 | 18 |
| **8 YRS** | 46–50 | 26 | 20 |

*Pick by the child's height rather than age where the two disagree — ages are a guide only.*`,
  },
  {
    id: 5,
    name: "Shoe size (EU)",
    sizeLabel: "Shoe Size",
    values: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    chart: `| EU | UK | Foot length (cm) |
| --- | --- | --- |
| **36** | 3 | 22.5 |
| **37** | 4 | 23.5 |
| **38** | 5 | 24 |
| **39** | 6 | 24.5 |
| **40** | 6.5 | 25 |
| **41** | 7.5 | 26 |
| **42** | 8 | 26.5 |
| **43** | 9 | 27.5 |
| **44** | 9.5 | 28 |
| **45** | 10.5 | 29 |

*Measure your foot at the end of the day, when it is at its largest.*`,
  },
  {
    id: 6,
    name: "Diaper size",
    sizeLabel: "Size",
    // Diapers are sold by the baby's WEIGHT, not by age or a garment size, so
    // the chart is the real content here — the chips alone tell a parent little.
    values: ["Newborn", "S", "M", "L", "XL", "XXL"],
    chart: `| Size | Baby weight (kg) | Typical age |
| --- | --- | --- |
| **Newborn** | up to 5 | 0–1 month |
| **S** | 4–8 | 1–4 months |
| **M** | 6–11 | 3–8 months |
| **L** | 9–14 | 6–18 months |
| **XL** | 12–17 | 15–24 months |
| **XXL** | 15+ | 2 years and over |

*Weight ranges overlap on purpose — size up if the current one leaves marks.*`,
  },
  {
    id: 7,
    name: "Bed size",
    sizeLabel: "Bed Size",
    values: ["Single", "Semi-Double", "Double", "Queen", "King"],
    chart: `| Bed Size | Mattress (in) | Bedsheet (in) |
| --- | --- | --- |
| **Single** | 36 × 78 | 54 × 90 |
| **Semi-Double** | 48 × 78 | 66 × 90 |
| **Double** | 54 × 78 | 90 × 100 |
| **Queen** | 60 × 78 | 92 × 102 |
| **King** | 72 × 78 | 108 × 108 |

*Bedsheet sizes allow for tuck-in on a standard 8" mattress.*`,
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
