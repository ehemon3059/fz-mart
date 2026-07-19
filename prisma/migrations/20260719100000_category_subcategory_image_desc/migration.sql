-- Optional hero image + short description for categories and subcategories,
-- shown on the storefront category/subcategory pages.
ALTER TABLE `Category`
  ADD COLUMN `imageUrl` VARCHAR(191) NULL,
  ADD COLUMN `description` TEXT NULL;

ALTER TABLE `Subcategory`
  ADD COLUMN `imageUrl` VARCHAR(191) NULL,
  ADD COLUMN `description` TEXT NULL;
