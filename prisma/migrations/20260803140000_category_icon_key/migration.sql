-- Optional icon key for categories, used when no imageUrl is set. Nullable so
-- every existing row stays valid and keeps falling back to the name-keyword
-- icon the storefront already derives.
ALTER TABLE `Category` ADD COLUMN `iconKey` VARCHAR(191) NULL;
