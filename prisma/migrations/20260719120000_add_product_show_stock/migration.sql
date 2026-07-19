-- Storefront stock-count visibility for simple (variant-less) products.
-- Mirrors ProductVariant.showStock; hides the "In stock (N available)" number
-- without affecting availability.
ALTER TABLE `Product`
  ADD COLUMN `showStock` BOOLEAN NOT NULL DEFAULT true;
