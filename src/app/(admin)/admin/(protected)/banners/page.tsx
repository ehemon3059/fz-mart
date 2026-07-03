import Link from "next/link";
import Image from "next/image";
import { listAllBanners } from "@/server/banners/admin";
import { BANNER_SLOTS } from "@/lib/banner-slots";
import DeleteButton from "@/components/admin/DeleteButton";
import { removeBanner } from "./actions";

export default async function AdminBannersPage() {
  const banners = await listAllBanners();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hero Banners</h1>
          <p className="mt-1 text-sm text-stone-500">
            The homepage hero has three areas. Upload an image to each — the big left banner can hold
            several images that rotate as a carousel.
          </p>
        </div>
        <Link
          href="/admin/banners/new"
          className="shrink-0 rounded bg-black px-4 py-2 text-sm font-medium text-white"
        >
          + New Banner
        </Link>
      </div>

      {BANNER_SLOTS.map((spec) => {
        const slotBanners = banners.filter((b) => b.slot === spec.slot);
        return (
          <section key={spec.slot}>
            <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-stone-200 pb-2">
              <h2 className="text-[15px] font-bold text-stone-900">
                {spec.label}
                {spec.multiple && (
                  <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-500">
                    Multiple card section
                  </span>
                )}
              </h2>
              <span className="text-[12.5px] text-stone-500">
                {spec.recommendedWidth}×{spec.recommendedHeight}px · {spec.ratioW}:{spec.ratioH} · ≤{Math.round(spec.maxBytes / 1024)} KB
              </span>
            </div>

            {slotBanners.length === 0 ? (
              <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-4 py-6 text-center text-[13px] text-stone-400">
                No image for this card yet.{" "}
                <Link href="/admin/banners/new" className="font-medium text-stone-600 underline">
                  Add one
                </Link>
                .
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {slotBanners.map((banner) => (
                  <div key={banner.id} className="overflow-hidden rounded-lg border bg-white">
                    <div className="relative aspect-[2/1] bg-gray-100">
                      <Image src={banner.imageUrl} alt="" fill className="object-cover" />
                    </div>
                    <div className="flex items-center justify-between p-3 text-sm">
                      <span className={banner.isActive ? "text-green-700" : "text-gray-400"}>
                        {banner.isActive ? "Active" : "Inactive"}
                      </span>
                      <div className="flex gap-3">
                        <Link href={`/admin/banners/${banner.id}/edit`} className="underline">
                          Edit
                        </Link>
                        <DeleteButton action={removeBanner} id={banner.id} label="banner" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
