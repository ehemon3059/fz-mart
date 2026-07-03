-- Rename `label` -> `size` (preserving existing rows) and make it nullable,
-- then add the optional `colorName` dimension for color × size matrices.
ALTER TABLE `ProductVariant` CHANGE COLUMN `label` `size` VARCHAR(191) NULL;
ALTER TABLE `ProductVariant` ADD COLUMN `colorName` VARCHAR(191) NULL;
