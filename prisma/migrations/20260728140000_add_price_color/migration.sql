-- Optional storefront price text colour, as a #rrggbb hex string.
-- Nullable with no default: NULL means "not set", and the storefront falls back
-- to the theme's default near-black. Additive only — existing rows are
-- untouched and every product keeps its current appearance.
ALTER TABLE `Product` ADD COLUMN `priceColor` VARCHAR(191) NULL;

-- Per-variant override; NULL inherits Product.priceColor.
ALTER TABLE `ProductVariant` ADD COLUMN `priceColor` VARCHAR(191) NULL;
