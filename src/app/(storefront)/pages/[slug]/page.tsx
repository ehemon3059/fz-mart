import { notFound } from "next/navigation";
import { getPageBySlug } from "@/server/pages";

export default async function StaticPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) notFound();

  return (
    <article className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">{page.title}</h1>
      <div className="whitespace-pre-wrap text-gray-700">{page.content}</div>
    </article>
  );
}
