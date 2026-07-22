"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MenuIcon, BoltIcon } from "./icons";
import { buildTree, type TreeNode } from "@/server/categories/tree";

type Cat = { id: number; name: string; slug: string; parentId: number | null };

/**
 * Sticky category bar with an "All Categories" mega-menu. Hovering a column
 * item reveals its children in the next column, so the arbitrarily-deep
 * category tree browses as cascading panels (the screenshot's 3-column drill).
 */
export default function CategoryNav({ categories }: { categories: Cat[] }) {
  const roots = useMemo(() => buildTree(categories), [categories]);
  // `path` holds the hovered node id at each column depth. Column k+1 shows the
  // children of path[k]. Empty = menu closed.
  const [path, setPath] = useState<number[]>([]);
  const [open, setOpen] = useState(false);

  // Resolve the list of nodes to render in each open column from `path`.
  const columns = useMemo(() => {
    const cols: TreeNode<Cat>[][] = [roots];
    let level = roots;
    for (const id of path) {
      const node = level.find((n) => n.id === id);
      if (!node || node.children.length === 0) break;
      cols.push(node.children);
      level = node.children;
    }
    return cols;
  }, [roots, path]);

  const close = () => {
    setOpen(false);
    setPath([]);
  };

  return (
    <nav className="catnav">
      <div className="wrap">
        <div
          className="megamenu-root"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={close}
        >
          <Link href="/category" className="allcat">
            <MenuIcon size={15} /> All Categories
          </Link>

          {open && roots.length > 0 && (
            <div className="megamenu" role="menu">
              {columns.map((col, depth) => (
                <ul className="megamenu-col" key={depth}>
                  {col.map((node) => {
                    const active = path[depth] === node.id;
                    const hasChildren = node.children.length > 0;
                    return (
                      <li key={node.id}>
                        <Link
                          href={`/category/${node.slug}`}
                          className={`megamenu-item${active ? " is-active" : ""}`}
                          onMouseEnter={() => setPath((p) => [...p.slice(0, depth), node.id])}
                          onClick={close}
                          role="menuitem"
                        >
                          <span>{node.name}</span>
                          {hasChildren && <span className="megamenu-caret">›</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ))}
            </div>
          )}
        </div>

        {roots.slice(0, 8).map((cat) => (
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
