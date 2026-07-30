import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveProductImages, resolvePrimaryImage } from "../../src/lib/product-images";

// A curated gallery always wins — option photos never merge into it.
test("uses the gallery when the product has one", () => {
  const images = resolveProductImages({
    images: [
      { id: 1, url: "/a.jpg", isPrimary: false },
      { id: 2, url: "/b.jpg", isPrimary: true },
    ],
    variants: [{ imageUrl: "/variant.jpg" }],
  });
  assert.deepEqual(
    images.map((i) => i.url),
    ["/a.jpg", "/b.jpg"],
  );
  // isPrimary is preserved, not reassigned to the first row.
  assert.equal(resolvePrimaryImage({ images, variants: [] }), "/b.jpg");
});

// The mega-deal case: every photo was uploaded per-option, gallery is empty.
test("falls back to variant photos when the gallery is empty", () => {
  const product = {
    images: [],
    variants: [{ imageUrl: "/sm.jpg" }, { imageUrl: "/xl.jpg" }],
  };
  const images = resolveProductImages(product);
  assert.deepEqual(
    images.map((i) => i.url),
    ["/sm.jpg", "/xl.jpg"],
  );
  // First variant photo becomes the cover, so first paint shows a real photo.
  assert.equal(images[0].isPrimary, true);
  assert.equal(resolvePrimaryImage(product), "/sm.jpg");
});

test("falls back to colour swatch photos, after variants", () => {
  const images = resolveProductImages({
    images: [],
    variants: [{ imageUrl: "/v.jpg" }],
    colors: [{ imageUrl: "/c.jpg" }],
  });
  assert.deepEqual(
    images.map((i) => i.url),
    ["/v.jpg", "/c.jpg"],
  );
});

// Rows sharing a colour commonly reuse one photo; the strip must not repeat it.
test("dedupes repeated option photos", () => {
  const images = resolveProductImages({
    images: [],
    variants: [{ imageUrl: "/same.jpg" }, { imageUrl: "/same.jpg" }, { imageUrl: "/other.jpg" }],
    colors: [{ imageUrl: "/same.jpg" }],
  });
  assert.deepEqual(
    images.map((i) => i.url),
    ["/same.jpg", "/other.jpg"],
  );
});

test("skips null and blank option photos", () => {
  const product = {
    images: [],
    variants: [{ imageUrl: null }, { imageUrl: "  " }, { imageUrl: "/real.jpg" }],
  };
  assert.deepEqual(
    resolveProductImages(product).map((i) => i.url),
    ["/real.jpg"],
  );
  assert.equal(resolvePrimaryImage(product), "/real.jpg");
});

// Callers substitute the placeholder themselves, so signal "nothing" as null.
test("returns nothing when the product has no photo anywhere", () => {
  const product = { images: [], variants: [{ imageUrl: null }], colors: [] };
  assert.deepEqual(resolveProductImages(product), []);
  assert.equal(resolvePrimaryImage(product), null);
});

// Synthetic ids are React keys in the thumbnail strip; they must be unique and
// never collide with a real ProductImage id.
test("synthetic ids are unique and negative", () => {
  const images = resolveProductImages({
    images: [],
    variants: [{ imageUrl: "/1.jpg" }, { imageUrl: "/2.jpg" }, { imageUrl: "/3.jpg" }],
  });
  const ids = images.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => id < 0));
});
