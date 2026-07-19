-- Link a product photo to the variant it shows, by label snapshot ("Navy / M").
-- A label (not a variantId FK) because variants are wiped & recreated on every
-- product save. NULL = whole-product photo.
ALTER TABLE `ProductImage`
  ADD COLUMN `variantLabel` VARCHAR(191) NULL;
