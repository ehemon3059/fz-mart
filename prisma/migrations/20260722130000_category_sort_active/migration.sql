-- ============================================================================
-- Category ordering support.
--
-- NOTE: `Category.sortOrder` and `Category.isActive` are NOT added here — they
-- have existed on the table since the initial migration, so re-adding them would
-- fail with a duplicate-column error. Likewise both foreign keys are already
-- ON DELETE RESTRICT (Category.parentId and Product.categoryId, created in
-- 20260722120000_add_category_tree), so no FK changes are needed either.
--
-- This migration only:
--   1. Adds a (parentId, sortOrder) index for sibling ordering. The existing
--      (parentId, isActive, sortOrder) index can't serve it — isActive sits
--      between the two columns.
--   2. Backfills sortOrder so, within each parent, existing categories are
--      numbered 0,1,2,… by current name order instead of all sitting at 0.
--
-- Runs AFTER 20260722120000_add_category_tree (which creates parentId), so a
-- single `prisma migrate deploy` applies them in the correct order.
-- ============================================================================

-- 1. Sibling-ordering index.
CREATE INDEX `Category_parentId_sortOrder_idx` ON `Category`(`parentId`, `sortOrder`);

-- 2. Backfill sortOrder = rank within parent by (name, id). A temp table holds
--    the computed ranks so the UPDATE doesn't read the table it writes (avoids
--    MySQL/TiDB error 1093). ROW_NUMBER partitions by parentId; all roots share
--    the NULL partition and are numbered together by name.
CREATE TEMPORARY TABLE `_cat_rank` AS
  SELECT `id`,
         CAST(ROW_NUMBER() OVER (PARTITION BY `parentId` ORDER BY `name` ASC, `id` ASC) - 1 AS SIGNED) AS `rn`
  FROM `Category`;

UPDATE `Category` c
  JOIN `_cat_rank` r ON r.`id` = c.`id`
  SET c.`sortOrder` = r.`rn`;

DROP TEMPORARY TABLE `_cat_rank`;
