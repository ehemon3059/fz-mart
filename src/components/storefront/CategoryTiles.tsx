import Link from "next/link";
import { CategoryIcon, categoryVisual, ArrowRight } from "./icons";

type Cat = {
  id: number;
  name: string;
  slug: string;
  children?: { id: number }[];
};

export default function CategoryTiles({ categories }: { categories: Cat[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="blk">
      <div className="sec-hd">
        <div className="sh-l">
          <h2>Shop by category</h2>
          <span className="sh-sub">Browse our top departments</span>
        </div>
        <Link className="viewall" href="/category">
          All categories <ArrowRight size={14} />
        </Link>
      </div>

      <div className="cat-tiles">
        {categories.slice(0, 12).map((cat) => {
          const v = categoryVisual(cat.name);
          const count = cat.children?.length ?? 0;
          return (
            <Link key={cat.id} href={`/category/${cat.slug}`} className="cat-tile">
              <span
                className="cat-ic"
                style={{ "--ct-bg": v.bg, "--ct-fg": v.fg } as React.CSSProperties}
              >
                <CategoryIcon name={cat.name} />
              </span>
              <b>{cat.name}</b>
              {count > 0 && <span>{count} subcategories</span>}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
