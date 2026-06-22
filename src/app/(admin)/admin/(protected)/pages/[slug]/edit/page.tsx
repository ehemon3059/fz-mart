import { notFound } from "next/navigation";
import { PAGE_SLUGS, PAGE_FALLBACK_TITLES, getPageBySlugForAdmin } from "@/server/pages/admin";
import PageForm from "../../PageForm";

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!PAGE_SLUGS.includes(slug as (typeof PAGE_SLUGS)[number])) notFound();

  const page = await getPageBySlugForAdmin(slug);
  const fallbackTitle = PAGE_FALLBACK_TITLES[slug as (typeof PAGE_SLUGS)[number]];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit {fallbackTitle}</h1>
      <PageForm slug={slug} page={page} fallbackTitle={fallbackTitle} />
    </div>
  );
}
