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
  // `tops[k]` is the vertical offset of the hovered row inside column k. Column
  // k+1 is pushed down by the sum of every offset above it so a child list opens
  // level with the parent row it belongs to, instead of at the panel's top edge.
  const [tops, setTops] = useState<number[]>([]);
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
    setTops([]);
  };

  /** Record the hover at `depth`, truncating anything deeper, and remember how
   *  far down the row sits so the next column can line up with it. */
  const hover = (depth: number, id: number, row: HTMLElement) => {
    // offsetTop is relative to the column (.megamenu-col is position:relative),
    // but it ignores scroll — a tall, scrolled column would otherwise push its
    // child far past the row the user is actually pointing at.
    const col = row.parentElement;
    const top = Math.max(0, row.offsetTop - (col?.scrollTop ?? 0));
    setPath((p) => [...p.slice(0, depth), id]);
    setTops((t) => [...t.slice(0, depth), top]);
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
                <ul
                  className="megamenu-col"
                  key={depth}
                  // Sum of the hovered-row offsets in every column to the left.
                  style={{ marginTop: tops.slice(0, depth).reduce((a, b) => a + b, 0) }}
                >
                  {col.map((node) => {
                    const active = path[depth] === node.id;
                    const hasChildren = node.children.length > 0;
                    return (
                      <li key={node.id}>
                        <Link
                          href={`/category/${node.slug}`}
                          className={`megamenu-item${active ? " is-active" : ""}`}
                          onMouseEnter={(e) => hover(depth, node.id, e.currentTarget.parentElement!)}
                          onFocus={(e) => hover(depth, node.id, e.currentTarget.parentElement!)}
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
