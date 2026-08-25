/**
 * Seeds the delivery-location tree (Division → District → Upazila) and the four
 * courier zones it prices against.
 *
 * The place names and the rates come straight from the client's reference
 * checkout: inside Dhaka city ৳70, the Dhaka sub-urban ring ৳100, everywhere
 * else ৳130. What was hardcoded there is data here — after this runs, the admin
 * can rename any location, remap it to another zone, or reprice a zone, and
 * checkout follows without a deploy.
 *
 * The sub-urban rule is the interesting one. Savar, Dhamrai, Keraniganj,
 * Nawabganj and Dohar sit INSIDE Dhaka district but the couriers bill them as
 * sub-urban. Rather than encode that as a special case, those five upazilas
 * simply carry their own zone, which wins over their district's by the ordinary
 * most-specific-first rule. Gazipur/Narayanganj/Manikganj/Munshiganj get the
 * same zone one level up, at district level.
 *
 * Idempotent by slug: re-running updates names in place and never duplicates.
 * Locations an admin ADDED by hand are left alone — this only touches slugs it
 * owns. An admin's zone REMAPPING of a seeded location is preserved too (see
 * keepZone below), so re-running to pick up new districts never silently
 * reverts pricing the shop deliberately changed.
 *
 * Run with:  npx tsx --env-file=.env prisma/seed-locations.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Zone keys used below; the seed maps each to a real ShippingZone row. */
type ZoneKey = "inside" | "suburb" | "outside" | "free";

const ZONES: { key: ZoneKey; name: string; taka: number; sortOrder: number; isFallback: boolean }[] = [
  { key: "inside", name: "ইনসাইড ঢাকা সিটি", taka: 70, sortOrder: 10, isFallback: false },
  { key: "suburb", name: "ঢাকা সাব-আরবান", taka: 100, sortOrder: 20, isFallback: false },
  // The catch-all: any location whose chain names no zone is billed at this
  // rate, so a district added later is never unpriced.
  { key: "outside", name: "আউটসাইড ঢাকা (অল বাংলাদেশ)", taka: 130, sortOrder: 30, isFallback: true },
  { key: "free", name: "ফ্রি ডেলিভারি", taka: 0, sortOrder: 40, isFallback: false },
];

interface UpazilaSeed {
  name: string;
  slug: string;
  /** Overrides the district's zone — used for the Dhaka sub-urban thanas. */
  zone?: ZoneKey;
}
interface DistrictSeed {
  name: string;
  slug: string;
  zone?: ZoneKey;
  upazilas?: UpazilaSeed[];
}
interface DivisionSeed {
  name: string;
  slug: string;
  zone?: ZoneKey;
  districts: DistrictSeed[];
}

const DIVISIONS: DivisionSeed[] = [
  {
    name: "ঢাকা",
    slug: "dhaka",
    districts: [
      {
        name: "ঢাকা",
        slug: "dhaka",
        zone: "inside",
        upazilas: [
          { name: "ধানমন্ডি", slug: "dhanmondi" },
          { name: "গুলশান", slug: "gulshan" },
          { name: "মিরপুর", slug: "mirpur" },
          { name: "উত্তরা", slug: "uttara" },
          { name: "মোহাম্মদপুর", slug: "mohammadpur" },
          { name: "শাহবাগ", slug: "shahbagh" },
          // Inside Dhaka district, billed sub-urban by the couriers.
          { name: "সাভার", slug: "savar", zone: "suburb" },
          { name: "ধামরাই", slug: "dhamrai", zone: "suburb" },
          { name: "কেরানীগঞ্জ", slug: "keraniganj", zone: "suburb" },
          { name: "নবাবগঞ্জ", slug: "nawabganj-dhaka", zone: "suburb" },
          { name: "দোহার", slug: "dohar", zone: "suburb" },
        ],
      },
      {
        name: "গাজীপুর",
        slug: "gazipur",
        zone: "suburb",
        upazilas: [
          { name: "গাজীপুর সদর", slug: "gazipur-sadar" },
          { name: "কালিয়াকৈর", slug: "kaliakair" },
          { name: "শ্রীপুর", slug: "sreepur-gazipur" },
          { name: "কাপাসিয়া", slug: "kapasia" },
          { name: "কালীগঞ্জ", slug: "kaliganj-gazipur" },
        ],
      },
      {
        name: "নারায়ণগঞ্জ",
        slug: "narayanganj",
        zone: "suburb",
        upazilas: [
          { name: "নারায়ণগঞ্জ সদর", slug: "narayanganj-sadar" },
          { name: "রূপগঞ্জ", slug: "rupganj" },
          { name: "সোনারগাঁও", slug: "sonargaon" },
          { name: "আড়াইহাজার", slug: "araihazar" },
          { name: "বন্দর", slug: "bandar" },
        ],
      },
      {
        name: "মানিকগঞ্জ",
        slug: "manikganj",
        zone: "suburb",
        upazilas: [
          { name: "মানিকগঞ্জ সদর", slug: "manikganj-sadar" },
          { name: "সিংগাইর", slug: "singair" },
          { name: "সাটুরিয়া", slug: "saturia" },
          { name: "ঘিওর", slug: "ghior" },
          { name: "শিবালয়", slug: "shibalaya" },
        ],
      },
      {
        name: "মুন্সীগঞ্জ",
        slug: "munshiganj",
        zone: "suburb",
        upazilas: [
          { name: "মুন্সীগঞ্জ সদর", slug: "munshiganj-sadar" },
          { name: "সিরাজদিখান", slug: "sirajdikhan" },
          { name: "শ্রীনগর", slug: "sreenagar" },
          { name: "লৌহজং", slug: "louhajang" },
          { name: "টঙ্গীবাড়ী", slug: "tongibari" },
        ],
      },
      {
        name: "টাঙ্গাইল",
        slug: "tangail",
        upazilas: [
          { name: "টাঙ্গাইল সদর", slug: "tangail-sadar" },
          { name: "মির্জাপুর", slug: "mirzapur" },
          { name: "ঘাটাইল", slug: "ghatail" },
          { name: "কালিহাতী", slug: "kalihati" },
          { name: "সখীপুর", slug: "sakhipur" },
          { name: "মধুপুর", slug: "madhupur" },
          { name: "বাসাইল", slug: "basail" },
        ],
      },
      {
        name: "কিশোরগঞ্জ",
        slug: "kishoreganj",
        upazilas: [
          { name: "কিশোরগঞ্জ সদর", slug: "kishoreganj-sadar" },
          { name: "ভৈরব", slug: "bhairab" },
          { name: "বাজিতপুর", slug: "bajitpur" },
          { name: "হোসেনপুর", slug: "hossainpur" },
          { name: "পাকুন্দিয়া", slug: "pakundia" },
        ],
      },
      { name: "নরসিংদী", slug: "narsingdi" },
      { name: "ফরিদপুর", slug: "faridpur" },
      { name: "গোপালগঞ্জ", slug: "gopalganj" },
      { name: "মাদারীপুর", slug: "madaripur" },
      { name: "রাজবাড়ী", slug: "rajbari" },
      { name: "শরীয়তপুর", slug: "shariatpur" },
    ],
  },
  {
    name: "চট্টগ্রাম",
    slug: "chattogram",
    districts: [
      {
        name: "চট্টগ্রাম",
        slug: "chattogram",
        upazilas: [
          { name: "কোতোয়ালী", slug: "kotwali-ctg" },
          { name: "পাহাড়তলী", slug: "pahartali" },
          { name: "পাঁচলাইশ", slug: "panchlaish" },
          { name: "হাটহাজারী", slug: "hathazari" },
          { name: "পটিয়া", slug: "patiya" },
          { name: "সীতাকুণ্ড", slug: "sitakunda" },
        ],
      },
      {
        name: "কুমিল্লা",
        slug: "cumilla",
        upazilas: [
          { name: "কুমিল্লা সদর", slug: "cumilla-sadar" },
          { name: "লাকসাম", slug: "laksam" },
          { name: "দাউদকান্দি", slug: "daudkandi" },
          { name: "দেবিদ্বার", slug: "debidwar" },
        ],
      },
      { name: "কক্সবাজার", slug: "coxs-bazar" },
      { name: "ফেণী", slug: "feni" },
      { name: "ব্রাহ্মণবাড়িয়া", slug: "brahmanbaria" },
      { name: "নোয়াখালী", slug: "noakhali" },
      { name: "লক্ষ্মীপুর", slug: "lakshmipur" },
      { name: "চাঁদপুর", slug: "chandpur" },
      { name: "খাগড়াছড়ি", slug: "khagrachhari" },
      { name: "রাঙ্গামাটি", slug: "rangamati" },
      { name: "বান্দরবান", slug: "bandarban" },
    ],
  },
  {
    name: "রাজশাহী",
    slug: "rajshahi",
    districts: [
      {
        name: "রাজশাহী",
        slug: "rajshahi",
        upazilas: [
          { name: "বোয়ালিয়া", slug: "boalia" },
          { name: "রাজপাড়া", slug: "rajpara" },
          { name: "মতিহার", slug: "motihar" },
          { name: "পবা", slug: "paba" },
          { name: "গোদাগাড়ী", slug: "godagari" },
        ],
      },
      { name: "বগুড়া", slug: "bogura" },
      { name: "পাবনা", slug: "pabna" },
      { name: "সিরাজগঞ্জ", slug: "sirajganj" },
      { name: "নওগাঁ", slug: "naogaon" },
      { name: "নাটোর", slug: "natore" },
      { name: "জয়পুরহাট", slug: "joypurhat" },
      { name: "চাঁপাইনবাবগঞ্জ", slug: "chapainawabganj" },
    ],
  },
  {
    name: "খুলনা",
    slug: "khulna",
    districts: [
      {
        name: "খুলনা",
        slug: "khulna",
        upazilas: [
          { name: "খুলনা সদর", slug: "khulna-sadar" },
          { name: "সোনাডাঙ্গা", slug: "sonadanga" },
          { name: "খালিশপুর", slug: "khalishpur" },
          { name: "দৌলতপুর", slug: "daulatpur-khulna" },
          { name: "রূপসা", slug: "rupsha" },
        ],
      },
      { name: "যশোর", slug: "jashore" },
      { name: "সাতক্ষীরা", slug: "satkhira" },
      { name: "বাগেরহাট", slug: "bagerhat" },
      { name: "ঝিনাইদহ", slug: "jhenaidah" },
      { name: "কুষ্টিয়া", slug: "kushtia" },
      { name: "মাগুরা", slug: "magura" },
      { name: "মেহেরপুর", slug: "meherpur" },
      { name: "নড়াইল", slug: "narail" },
      { name: "চুয়াডাঙ্গা", slug: "chuadanga" },
    ],
  },
  {
    name: "বরিশাল",
    slug: "barishal",
    districts: [
      {
        name: "বরিশাল",
        slug: "barishal",
        upazilas: [
          { name: "বরিশাল সদর", slug: "barishal-sadar" },
          { name: "বাকেরগঞ্জ", slug: "bakerganj" },
          { name: "বাবুগঞ্জ", slug: "babuganj" },
          { name: "উজিরপুর", slug: "wazirpur" },
        ],
      },
      { name: "পটুয়াখালী", slug: "patuakhali" },
      { name: "ভোলা", slug: "bhola" },
      { name: "পিরোজপুর", slug: "pirojpur" },
      { name: "বরগুনা", slug: "barguna" },
      { name: "ঝালকাঠি", slug: "jhalokati" },
    ],
  },
  {
    name: "সিলেট",
    slug: "sylhet",
    districts: [
      {
        name: "সিলেট",
        slug: "sylhet",
        upazilas: [
          { name: "সিলেট সদর", slug: "sylhet-sadar" },
          { name: "দক্ষিণ সুরমা", slug: "dakshin-surma" },
          { name: "গোলাপগঞ্জ", slug: "golapganj" },
          { name: "বীণাবাজার", slug: "beanibazar" },
        ],
      },
      { name: "মৌলভীবাজার", slug: "moulvibazar" },
      { name: "হবিগঞ্জ", slug: "habiganj" },
      { name: "সুনামগঞ্জ", slug: "sunamganj" },
    ],
  },
  {
    name: "রংপুর",
    slug: "rangpur",
    districts: [
      {
        name: "রংপুর",
        slug: "rangpur",
        upazilas: [
          { name: "রংপুর সদর", slug: "rangpur-sadar" },
          { name: "মিঠাপুকুর", slug: "mithapukur" },
          { name: "পীরগঞ্জ", slug: "pirganj-rangpur" },
          { name: "কাউনিয়া", slug: "kaunia" },
        ],
      },
      { name: "দিনাজপুর", slug: "dinajpur" },
      { name: "গাইবান্ধা", slug: "gaibandha" },
      { name: "কুড়িগ্রাম", slug: "kurigram" },
      { name: "লালমনিরহাট", slug: "lalmonirhat" },
      { name: "নীলফামারী", slug: "nilphamari" },
      { name: "পঞ্চগড়", slug: "panchagarh" },
      { name: "ঠাকুরগাঁও", slug: "thakurgaon" },
    ],
  },
  {
    name: "ময়মনসিংহ",
    slug: "mymensingh",
    districts: [
      {
        name: "ময়মনসিংহ",
        slug: "mymensingh",
        upazilas: [
          { name: "ময়মনসিংহ সদর", slug: "mymensingh-sadar" },
          { name: "মুক্তাগাছা", slug: "muktagacha" },
          { name: "ফুলবাড়িয়া", slug: "fulbaria" },
          { name: "ত্রিশাল", slug: "trishal" },
          { name: "ভালুকা", slug: "bhaluka" },
        ],
      },
      {
        name: "জামালপুর",
        slug: "jamalpur",
        upazilas: [
          { name: "জামালপুর সদর", slug: "jamalpur-sadar" },
          { name: "সরিষাবাড়ী", slug: "sarishabari" },
          { name: "মেলান্দহ", slug: "melandaha" },
          { name: "ইসলামপুর", slug: "islampur" },
        ],
      },
      { name: "শেরপুর", slug: "sherpur" },
      { name: "নেত্রকোণা", slug: "netrokona" },
    ],
  },
];

async function main() {
  // ── Zones. Matched by name so a shop that already created "Inside Dhaka"
  // under a different name gets a new row rather than having its live zone
  // (and every order pointing at it) silently rewritten.
  const zoneIds = new Map<ZoneKey, number>();
  for (const z of ZONES) {
    const existing = await prisma.shippingZone.findFirst({ where: { name: z.name } });
    if (existing) {
      zoneIds.set(z.key, existing.id);
      continue;
    }
    const created = await prisma.shippingZone.create({
      data: {
        name: z.name,
        charge: z.taka * 100, // paisa
        sortOrder: z.sortOrder,
        isActive: true,
        isFallback: z.isFallback,
      },
    });
    zoneIds.set(z.key, created.id);
  }

  // Exactly one fallback: clear any other before setting ours, so the
  // "first fallback wins" lookup can never depend on row order.
  const fallbackId = zoneIds.get("outside");
  if (fallbackId) {
    await prisma.shippingZone.updateMany({
      where: { isFallback: true, id: { not: fallbackId } },
      data: { isFallback: false },
    });
    await prisma.shippingZone.update({ where: { id: fallbackId }, data: { isFallback: true } });
  }

  const zoneFor = (key?: ZoneKey) => (key ? zoneIds.get(key) ?? null : null);

  /**
   * On re-run, keep the admin's zone choice. Only write a zone when the row is
   * new, or when the admin has not set one — never overwrite a deliberate
   * remap with the seed's opinion.
   */
  const keepZone = (current: number | null, seeded: number | null) =>
    current !== null ? current : seeded;

  let divCount = 0;
  let disCount = 0;
  let upzCount = 0;

  for (const [di, div] of DIVISIONS.entries()) {
    const seededDivZone = zoneFor(div.zone);
    const existingDiv = await prisma.division.findUnique({ where: { slug: div.slug } });
    const division = existingDiv
      ? await prisma.division.update({
          where: { id: existingDiv.id },
          data: {
            name: div.name,
            sortOrder: (di + 1) * 10,
            shippingZoneId: keepZone(existingDiv.shippingZoneId, seededDivZone),
          },
        })
      : await prisma.division.create({
          data: {
            name: div.name,
            slug: div.slug,
            sortOrder: (di + 1) * 10,
            shippingZoneId: seededDivZone,
          },
        });
    if (!existingDiv) divCount++;

    for (const [si, dis] of div.districts.entries()) {
      const seededDisZone = zoneFor(dis.zone);
      const existingDis = await prisma.district.findUnique({ where: { slug: dis.slug } });
      const district = existingDis
        ? await prisma.district.update({
            where: { id: existingDis.id },
            data: {
              name: dis.name,
              divisionId: division.id,
              sortOrder: (si + 1) * 10,
              shippingZoneId: keepZone(existingDis.shippingZoneId, seededDisZone),
            },
          })
        : await prisma.district.create({
            data: {
              name: dis.name,
              slug: dis.slug,
              divisionId: division.id,
              sortOrder: (si + 1) * 10,
              shippingZoneId: seededDisZone,
            },
          });
      if (!existingDis) disCount++;

      for (const [ui, upz] of (dis.upazilas ?? []).entries()) {
        const seededUpzZone = zoneFor(upz.zone);
        const existingUpz = await prisma.upazila.findUnique({ where: { slug: upz.slug } });
        if (existingUpz) {
          await prisma.upazila.update({
            where: { id: existingUpz.id },
            data: {
              name: upz.name,
              districtId: district.id,
              sortOrder: (ui + 1) * 10,
              shippingZoneId: keepZone(existingUpz.shippingZoneId, seededUpzZone),
            },
          });
        } else {
          await prisma.upazila.create({
            data: {
              name: upz.name,
              slug: upz.slug,
              districtId: district.id,
              sortOrder: (ui + 1) * 10,
              shippingZoneId: seededUpzZone,
            },
          });
          upzCount++;
        }
      }
    }
  }

  console.log(
    `Locations seeded — ${divCount} new divisions, ${disCount} new districts, ${upzCount} new upazilas.`,
  );
  console.log("Zones:", [...zoneIds.entries()].map(([k, id]) => `${k}=#${id}`).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
