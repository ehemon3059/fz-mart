import Link from "next/link";
import { CategoryIcon, categoryVisual, ArrowRight } from "./icons";
import { categoryArt } from "@/lib/category-art";

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
          const art = categoryArt(cat.slug);
          const count = cat.children?.length ?? 0;
          const v = art ? null : categoryVisual(cat.name);
          return (
            <Link key={cat.id} href={`/category/${cat.slug}`} className="cat-tile">
              {art ? (
                // Background image rather than <img>: the art is decorative
                // (the name below already labels the tile), and this keeps the
                // float/scale transforms on one element.
                <span className="cat-art" style={{ backgroundImage: `url("${art}")` }} />
              ) : (
                <span
                  className="cat-ic"
                  style={{ "--ct-bg": v!.bg, "--ct-fg": v!.fg } as React.CSSProperties}
                >
                  {/* Sized up from the 28px default: the tinted circle matches
                      the illustrations' 112px footprint, so a default-size
                      glyph would float in the middle of it. */}
                  <CategoryIcon name={cat.name} size={52} />
                </span>
              )}
              <b>{cat.name}</b>
              {count > 0 && <span className="cat-sub">{count} subcategories</span>}
              <span className="cat-cta">
                <span>Shop Now</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
