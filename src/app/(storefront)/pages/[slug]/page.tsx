import { notFound } from "next/navigation";
import Link from "next/link";
import { getPageBySlug } from "@/server/pages";

// page.updatedAt is a real Date on a cache miss but an ISO string on a cache
// hit (getOrSetCache round-trips values through JSON) — normalize here.
function fmtDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function StaticPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) notFound();

  return (
    <div className="font-manrope mx-auto max-w-[760px] px-6 py-12">
      <nav className="mb-7 flex items-center gap-1.5 text-[13px] text-stone-400">
        <Link href="/" className="font-medium text-stone-500 transition hover:text-brand-600">
          Home
        </Link>
        <span>/</span>
        <span className="font-medium text-stone-700">{page.title}</span>
      </nav>

      <h1 className="text-[40px] font-extrabold leading-[1.1] tracking-tight text-stone-900">
        {page.title}
      </h1>

      <p className="mt-3 text-[13px] text-stone-400">
        Last updated {fmtDate(page.updatedAt)}
      </p>

      <hr className="mt-9 border-stone-200" />

      {/* Content is sanitized on save (see server/pages/sanitize.ts). */}
      <article
        className="prose-article mt-8"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />
    </div>
  );
}
