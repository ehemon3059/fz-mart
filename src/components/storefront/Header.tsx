import Link from "next/link";
import { listActiveCategories } from "@/server/categories";
import CartIcon from "./CartIcon";
import MobileNav from "./MobileNav";

export default async function Header() {
  const categories = await listActiveCategories();

  return (
    <header className="border-b bg-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
          <MobileNav categories={categories} />
          <Link href="/" className="text-xl font-bold text-gray-900">
            fz-mart
          </Link>
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-700">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="hover:text-black"
            >
              {cat.name}
            </Link>
          ))}
          <Link href="/track" className="hover:text-black">
            Track Order
          </Link>
        </nav>
        <CartIcon />
      </div>
    </header>
  );
}
