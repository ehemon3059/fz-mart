import Link from "next/link";
import { MenuIcon, BoltIcon } from "./icons";

type Cat = { id: number; name: string; slug: string };

export default function CategoryNav({ categories }: { categories: Cat[] }) {
  return (
    <nav className="catnav">
      <div className="wrap">
        <Link href="/products" className="allcat">
          <MenuIcon size={15} /> All Categories
        </Link>
        {categories.slice(0, 8).map((cat) => (
          <Link key={cat.id} href={`/category/${cat.slug}`} className="clink">
            {cat.name}
          </Link>
        ))}
        <span className="spacer" />
        <Link href="#flash-sale" className="clink deal-link">
          <BoltIcon size={14} /> Today&apos;s Deals
        </Link>
      </div>
    </nav>
  );
}
