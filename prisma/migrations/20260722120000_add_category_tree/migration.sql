-- ============================================================================
-- Collapse Category + Subcategory into a single self-referencing Category tree,
-- and repoint Product from `subcategoryId` to a flexible `categoryId` (any node).
--
-- This migration is forward-only and does DDL + a one-time DATA BACKFILL in a
-- single, ordered pass so `prisma migrate deploy` applies it atomically in the
-- right order (categoryId is fully populated BEFORE it is made NOT NULL and the
-- Subcategory table is dropped). Run it against a local/staging copy first, and
-- back up production before deploying.
--
-- Ordered steps:
--   1. Additive columns (nullable): Category.parentId, Category._legacySubId,
--      Product.categoryId.
--   2. Backfill: create one child Category per Subcategory (parentId = its
--      categoryId), then remap every Product to the new child Category.
--   3. Cleanup: enforce Product.categoryId NOT NULL, drop the old
--      subcategoryId column/index/FK, drop the Subcategory table and the
--      throwaway _legacySubId column, add the new index + FK.
-- ============================================================================

-- ── 1. Additive columns ────────────────────────────────────────────────────
ALTER TABLE `Category` ADD COLUMN `parentId` INTEGER NULL;
-- Throwaway mapping column: old Subcategory.id this node was migrated from.
ALTER TABLE `Category` ADD COLUMN `_legacySubId` INTEGER NULL;
ALTER TABLE `Product` ADD COLUMN `categoryId` INTEGER NULL;

-- ── 2. Backfill ─────────────────────────────────────────────────────────────
-- Snapshot the existing (root) category slugs into a helper table so the INSERT
-- below can test for slug collisions without selecting from the table it writes
-- to (MySQL/TiDB error 1093). A plain table is used, not CREATE TEMPORARY TABLE
-- ... AS SELECT — TiDB does not implement `CREATE TABLE ... SELECT` (error 1105).
-- Subcategory slugs are unique among themselves, so the only possible clash is
-- with an original category slug; on clash we suffix with the subcategory id to
-- stay globally unique.
DROP TABLE IF EXISTS `_existing_cat_slugs`;
CREATE TABLE `_existing_cat_slugs` (`slug` VARCHAR(191) NOT NULL);
INSERT INTO `_existing_cat_slugs` (`slug`) SELECT `slug` FROM `Category`;

INSERT INTO `Category`
  (`parentId`, `name`, `slug`, `imageUrl`, `description`, `sortOrder`, `isActive`, `createdAt`, `updatedAt`, `_legacySubId`)
SELECT
  s.`categoryId`,
  s.`name`,
  IF(s.`slug` IN (SELECT `slug` FROM `_existing_cat_slugs`), CONCAT(s.`slug`, '-', s.`id`), s.`slug`),
  s.`imageUrl`,
  s.`description`,
  s.`sortOrder`,
  s.`isActive`,
  s.`createdAt`,
  s.`updatedAt`,
  s.`id`
FROM `Subcategory` s;

DROP TABLE `_existing_cat_slugs`;

-- Repoint every product to the freshly-created child category.
UPDATE `Product` p
  JOIN `Category` c ON c.`_legacySubId` = p.`subcategoryId`
  SET p.`categoryId` = c.`id`;

-- ── 3. Cleanup ──────────────────────────────────────────────────────────────
ALTER TABLE `Product` MODIFY COLUMN `categoryId` INTEGER NOT NULL;

-- Drop old Product → Subcategory wiring.
ALTER TABLE `Product` DROP FOREIGN KEY `Product_subcategoryId_fkey`;
DROP INDEX `Product_subcategoryId_status_idx` ON `Product`;
ALTER TABLE `Product` DROP COLUMN `subcategoryId`;

-- Drop the Subcategory table (its rows now live as child categories).
ALTER TABLE `Subcategory` DROP FOREIGN KEY `Subcategory_categoryId_fkey`;
DROP TABLE `Subcategory`;

-- Retire the mapping column and the old category index.
ALTER TABLE `Category` DROP COLUMN `_legacySubId`;
DROP INDEX `Category_isActive_sortOrder_idx` ON `Category`;

-- New indexes + foreign keys for the tree + product placement.
CREATE INDEX `Category_parentId_isActive_sortOrder_idx` ON `Category`(`parentId`, `isActive`, `sortOrder`);
CREATE INDEX `Product_categoryId_status_idx` ON `Product`(`categoryId`, `status`);
ALTER TABLE `Category` ADD CONSTRAINT `Category_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
