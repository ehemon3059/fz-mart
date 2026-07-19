-- Per-variant sale price (paisa) and storefront stock-count visibility.
ALTER TABLE `ProductVariant`
  ADD COLUMN `discountPrice` INTEGER NULL,
  ADD COLUMN `showStock` BOOLEAN NOT NULL DEFAULT true;
