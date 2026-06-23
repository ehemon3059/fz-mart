import { PageRow, type AdminPageRow } from "./PageRow";

interface Props {
  category: string;
  pages: AdminPageRow[];
}

export function CategorySection({ category, pages }: Props) {
  if (pages.length === 0) return null;

  return (
    <section>
      {/* Section label */}
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-stone-500">
          {category}
        </h2>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11.5px] font-semibold text-stone-500">
          {pages.length}
        </span>
        <span className="h-px flex-1 bg-stone-200" />
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-soft">
        {pages.map((page, i) => (
          <PageRow key={page.slug} page={page} first={i === 0} />
        ))}
      </div>
    </section>
  );
}
