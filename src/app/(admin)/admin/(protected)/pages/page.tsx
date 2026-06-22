import Link from "next/link";
import { PAGE_SLUGS, PAGE_FALLBACK_TITLES, listAllPages } from "@/server/pages/admin";

export default async function AdminPagesPage() {
  const pages = await listAllPages();
  const bySlug = new Map(pages.map((p) => [p.slug, p]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Pages</h1>

      <div className="space-y-4">
        {PAGE_SLUGS.map((slug) => {
          const page = bySlug.get(slug);
          return (
            <div
              key={slug}
              className="border rounded-lg bg-white p-4 flex items-center justify-between"
            >
              <div>
                <span className="font-semibold">
                  {page?.title ?? PAGE_FALLBACK_TITLES[slug]}
                </span>{" "}
                <span className="text-xs text-gray-400">/{slug}</span>
                {!page && (
                  <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                    Not set up yet
                  </span>
                )}
              </div>
              <Link href={`/admin/pages/${slug}/edit`} className="underline text-sm">
                Edit
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
