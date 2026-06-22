"use client";

import { useState } from "react";
import Link from "next/link";

interface CategoryLink {
  id: number;
  slug: string;
  name: string;
}

export default function MobileNav({ categories }: { categories: CategoryLink[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="p-2 -mr-2"
      >
        <span className="block w-6 h-0.5 bg-gray-900 mb-1.5" />
        <span className="block w-6 h-0.5 bg-gray-900 mb-1.5" />
        <span className="block w-6 h-0.5 bg-gray-900" />
      </button>

      {open && (
        <nav className="absolute left-0 right-0 top-16 bg-white border-b shadow-sm">
          <ul className="px-4 py-2 divide-y">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/category/${cat.slug}`}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-gray-700"
                >
                  {cat.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/track"
                onClick={() => setOpen(false)}
                className="block py-3 text-gray-700"
              >
                Track Order
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
