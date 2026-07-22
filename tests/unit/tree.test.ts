import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildTree,
  keepReachable,
  collectDescendantIds,
  ancestorsOf,
  lineageIds,
  wouldCreateCycle,
  computeDeleteImpact,
  type FlatNode,
} from "../../src/server/categories/tree";

// Test rows carry the optional ordering fields buildTree sorts by.
type Row = FlatNode & { name: string; sortOrder: number };
const row = (id: number, parentId: number | null, name: string, sortOrder = 0): Row => ({
  id,
  parentId,
  name,
  sortOrder,
});

test("buildTree assembles roots and nests children", () => {
  const flat = [row(1, null, "Root"), row(2, 1, "Child"), row(3, 2, "Grandchild")];
  const [root] = buildTree(flat);
  assert.equal(root.id, 1);
  assert.equal(root.children.length, 1);
  assert.equal(root.children[0].id, 2);
  assert.equal(root.children[0].children[0].id, 3);
});

test("buildTree orders siblings by sortOrder then name", () => {
  const flat = [
    row(1, null, "Root"),
    row(4, 1, "Banana", 0),
    row(2, 1, "Zebra", 0), // same sortOrder as Banana → name breaks the tie
    row(3, 1, "Apple", -1), // lower sortOrder wins regardless of name
  ];
  const [root] = buildTree(flat);
  assert.deepEqual(
    root.children.map((c) => c.name),
    ["Apple", "Banana", "Zebra"],
  );
});

test("buildTree orders roots by sortOrder then name too", () => {
  const flat = [row(1, null, "Beta", 1), row(2, null, "Alpha", 1), row(3, null, "First", 0)];
  assert.deepEqual(
    buildTree(flat).map((r) => r.name),
    ["First", "Alpha", "Beta"],
  );
});

test("buildTree treats a node with a missing parent as a root (no silent drop)", () => {
  const flat = [row(1, null, "Root"), row(2, 99, "Orphan")]; // parent 99 doesn't exist
  const roots = buildTree(flat);
  assert.deepEqual(roots.map((r) => r.id).sort(), [1, 2]);
});

test("keepReachable drops a node whose parent is missing (inactive), and its subtree", () => {
  // 1 (root) present; 2's parent 99 is absent; 3 is a child of the dropped 2.
  const flat = [row(1, null, "Root"), row(2, 99, "OrphanBranch"), row(3, 2, "UnderOrphan")];
  const kept = keepReachable(flat).map((n) => n.id).sort();
  assert.deepEqual(kept, [1]);
});

test("keepReachable keeps a fully-connected subtree", () => {
  const flat = [row(1, null, "R"), row(2, 1, "A"), row(3, 2, "B")];
  assert.equal(keepReachable(flat).length, 3);
});

test("collectDescendantIds returns the whole subtree including the node", () => {
  const flat = [row(1, null, "R"), row(2, 1, "A"), row(3, 1, "B"), row(4, 2, "A1")];
  assert.deepEqual(collectDescendantIds(1, flat).sort((a, b) => a - b), [1, 2, 3, 4]);
  assert.deepEqual(collectDescendantIds(2, flat).sort((a, b) => a - b), [2, 4]);
  assert.deepEqual(collectDescendantIds(3, flat), [3]);
});

test("deep nesting (6 levels): descendants, ancestors, lineage", () => {
  // 1 → 2 → 3 → 4 → 5 → 6
  const flat = [
    row(1, null, "L0"),
    row(2, 1, "L1"),
    row(3, 2, "L2"),
    row(4, 3, "L3"),
    row(5, 4, "L4"),
    row(6, 5, "L5"),
  ];
  assert.equal(collectDescendantIds(1, flat).length, 6);
  assert.deepEqual(
    ancestorsOf(6, flat).map((n) => n.id),
    [1, 2, 3, 4, 5], // root → … → immediate parent
  );
  assert.deepEqual(lineageIds(6, flat).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6]);

  // buildTree reaches full depth.
  let node = buildTree(flat)[0];
  let depth = 1;
  while (node.children.length) {
    node = node.children[0];
    depth++;
  }
  assert.equal(depth, 6);
});

test("cycle detection: self-parent and reparent-under-descendant are rejected", () => {
  const flat = [row(1, null, "R"), row(2, 1, "A"), row(3, 2, "B")];
  // Moving node 1 under itself.
  assert.equal(wouldCreateCycle(1, 1, flat), true);
  // Moving node 1 under its own descendant (3).
  assert.equal(wouldCreateCycle(1, 3, flat), true);
  // Moving a leaf under an unrelated node is fine.
  assert.equal(wouldCreateCycle(3, 1, flat), false);
});

test("empty input is handled everywhere", () => {
  assert.deepEqual(buildTree([]), []);
  assert.deepEqual(keepReachable([]), []);
  assert.deepEqual(ancestorsOf(1, []), []);
  // A lone id with no rows collects just itself.
  assert.deepEqual(collectDescendantIds(1, []), [1]);
});

test("computeDeleteImpact counts the subtree and its products", () => {
  // 1 → 2 → 3 ; products distributed across the tree + one outside it.
  const cats = [row(1, null, "R"), row(2, 1, "A"), row(3, 2, "B")];
  const productCategoryIds = [2, 2, 3, 999]; // two on 2, one on 3, one on an unrelated cat

  const atRoot = computeDeleteImpact(1, cats, productCategoryIds);
  assert.deepEqual(atRoot, { descendantCount: 2, productCount: 3 });

  const atMid = computeDeleteImpact(2, cats, productCategoryIds);
  assert.deepEqual(atMid, { descendantCount: 1, productCount: 3 });

  const atLeaf = computeDeleteImpact(3, cats, productCategoryIds);
  assert.deepEqual(atLeaf, { descendantCount: 0, productCount: 1 });

  // A truly empty leaf: no descendants, no products.
  const emptyLeaf = computeDeleteImpact(3, cats, []);
  assert.deepEqual(emptyLeaf, { descendantCount: 0, productCount: 0 });
});
