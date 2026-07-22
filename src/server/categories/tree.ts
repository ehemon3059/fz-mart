// Helpers for the self-referencing Category tree. Prisma can't `include`
// unbounded depth, so callers fetch every category row flat (with parentId) and
// assemble/query the hierarchy here. All functions are pure and dependency-free
// so they can run on the server or be shipped to client components.

/** Minimal shape every tree helper needs. Real rows carry much more; the
 *  optional fields let buildTree order siblings when they're present. */
export interface FlatNode {
  id: number;
  parentId: number | null;
  sortOrder?: number;
  name?: string;
}

/** A node with its children nested underneath, sorted (sortOrder, then name). */
export type TreeNode<T extends FlatNode> = T & { children: TreeNode<T>[] };

/** Sibling comparator: sortOrder ascending, then name ascending. Missing
 *  fields fall back to 0 / "" so the sort stays total and stable. */
function bySortThenName(a: FlatNode, b: FlatNode): number {
  const so = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  if (so !== 0) return so;
  return (a.name ?? "").localeCompare(b.name ?? "");
}

/**
 * Assemble a flat list into a forest of roots (parentId === null), with every
 * sibling group ordered by (sortOrder, name). Orphans (parent missing) are
 * treated as roots so nothing silently disappears — use keepReachable first if
 * you want inactive-parent subtrees pruned instead.
 */
export function buildTree<T extends FlatNode>(flat: T[]): TreeNode<T>[] {
  const byId = new Map<number, TreeNode<T>>();
  for (const n of flat) byId.set(n.id, { ...n, children: [] });

  const roots: TreeNode<T>[] = [];
  for (const n of flat) {
    const node = byId.get(n.id)!;
    const parent = n.parentId != null ? byId.get(n.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  // Order siblings everywhere in the tree.
  roots.sort(bySortThenName);
  for (const node of byId.values()) node.children.sort(bySortThenName);
  return roots;
}

/**
 * Keep only nodes whose entire ancestor chain is present in `flat`. When the
 * active-category list is passed in, this drops any node under a parent that
 * was filtered out (e.g. deactivated) — so an inactive parent hides its WHOLE
 * subtree instead of its active children being promoted to roots. Cycle-safe.
 */
export function keepReachable<T extends FlatNode>(flat: T[]): T[] {
  const byId = new Map<number, T>();
  for (const n of flat) byId.set(n.id, n);

  const reachable = new Map<number, boolean>();
  const isReachable = (n: T, guard: Set<number>): boolean => {
    if (n.parentId == null) return true;
    const cached = reachable.get(n.id);
    if (cached != null) return cached;
    const parent = byId.get(n.parentId);
    // Parent absent (filtered out) or a cycle → not reachable.
    const res = parent != null && !guard.has(n.id) ? isReachable(parent, guard.add(n.id)) : false;
    reachable.set(n.id, res);
    return res;
  };

  return flat.filter((n) => isReachable(n, new Set()));
}

/**
 * Every id in the subtree rooted at `rootId`, INCLUDING `rootId` itself.
 * Used to gather products from a category and all its descendants for listing
 * pages. Cycle-safe via a visited set.
 */
export function collectDescendantIds<T extends FlatNode>(rootId: number, flat: T[]): number[] {
  const childrenByParent = new Map<number, number[]>();
  for (const n of flat) {
    if (n.parentId == null) continue;
    const arr = childrenByParent.get(n.parentId) ?? [];
    arr.push(n.id);
    childrenByParent.set(n.parentId, arr);
  }

  const out: number[] = [];
  const seen = new Set<number>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    const kids = childrenByParent.get(id);
    if (kids) stack.push(...kids);
  }
  return out;
}

/**
 * The chain of ancestors of `nodeId`, ordered root → … → immediate parent
 * (does NOT include the node itself). Powers breadcrumbs. Cycle-safe.
 */
export function ancestorsOf<T extends FlatNode>(nodeId: number, flat: T[]): T[] {
  const byId = new Map<number, T>();
  for (const n of flat) byId.set(n.id, n);

  const chain: T[] = [];
  const seen = new Set<number>();
  let parentId = byId.get(nodeId)?.parentId ?? null;
  while (parentId != null && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    chain.unshift(parent);
    parentId = parent.parentId;
  }
  return chain;
}

/**
 * The node's own id plus every ancestor id — its full lineage toward the root.
 * A CATEGORY-scoped coupon matches a product when the coupon's category is
 * anywhere in the product's lineage, so a parent-category coupon reaches items
 * nested several levels beneath it.
 */
export function lineageIds<T extends FlatNode>(nodeId: number, flat: T[]): number[] {
  return [nodeId, ...ancestorsOf(nodeId, flat).map((n) => n.id)];
}

/** True when `candidateParentId` is `nodeId` itself or one of its descendants —
 *  i.e. re-parenting `nodeId` under it would create a cycle. */
export function wouldCreateCycle<T extends FlatNode>(
  nodeId: number,
  candidateParentId: number,
  flat: T[],
): boolean {
  return collectDescendantIds(nodeId, flat).includes(candidateParentId);
}

export interface DeleteImpact {
  /** Sub-categories in the node's subtree (excludes the node itself). */
  descendantCount: number;
  /** Products anywhere in the subtree (node + all descendants). */
  productCount: number;
}

/**
 * How much a delete of `nodeId` would take with it. Pure so it's unit-testable:
 * pass the flat category rows and one categoryId per product. A node is safe to
 * delete only when both counts are 0 (an empty leaf-ish node).
 */
export function computeDeleteImpact<T extends FlatNode>(
  nodeId: number,
  flat: T[],
  productCategoryIds: number[],
): DeleteImpact {
  const subtree = new Set(collectDescendantIds(nodeId, flat));
  return {
    descendantCount: subtree.size - 1, // minus the node itself
    productCount: productCategoryIds.filter((cid) => subtree.has(cid)).length,
  };
}
