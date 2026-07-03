-- Re-key Customer from an auto-increment INTEGER id to a custom string id of
-- the form `fz-6-XXXXXXXX` (generated in application code, see lib/customer-id.ts).
--
-- Existing customers are migrated in place. Because the id is referenced by
-- Order.customerId and ProductReview.customerId, we drop those foreign keys,
-- widen every column to VARCHAR, re-key each row with a DETERMINISTIC value
-- derived from the old numeric id (so parent and children compute the same new
-- id independently and stay consistent), then restore the foreign keys.

-- 1. Drop dependent foreign keys.
ALTER TABLE `Order` DROP FOREIGN KEY `Order_customerId_fkey`;
ALTER TABLE `ProductReview` DROP FOREIGN KEY `ProductReview_customerId_fkey`;

-- 2. Widen the primary key and both foreign-key columns to VARCHAR(191)
--    (Prisma's default String length on MySQL). MODIFY also drops the
--    AUTO_INCREMENT from Customer.id. Existing integers become their decimal
--    string form ('1', '2', '4'), so references still match textually.
ALTER TABLE `Customer` MODIFY `id` VARCHAR(191) NOT NULL;
ALTER TABLE `Order` MODIFY `customerId` VARCHAR(191) NULL;
ALTER TABLE `ProductReview` MODIFY `customerId` VARCHAR(191) NOT NULL;

-- 3. Re-key existing rows to the fz-6-XXXXXXXX format. The suffix is derived
--    deterministically from the OLD id, so children and the parent map to the
--    same new value without needing a temp mapping table. Update children
--    first while they still hold the old numeric value.
UPDATE `Order`
  SET `customerId` = CONCAT('fz-6-', UPPER(SUBSTRING(MD5(CONCAT('customer:', `customerId`)), 1, 8)))
  WHERE `customerId` IS NOT NULL;

UPDATE `ProductReview`
  SET `customerId` = CONCAT('fz-6-', UPPER(SUBSTRING(MD5(CONCAT('customer:', `customerId`)), 1, 8)));

UPDATE `Customer`
  SET `id` = CONCAT('fz-6-', UPPER(SUBSTRING(MD5(CONCAT('customer:', `id`)), 1, 8)));

-- 4. Restore the foreign keys (same referential actions as before).
ALTER TABLE `ProductReview` ADD CONSTRAINT `ProductReview_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Order` ADD CONSTRAINT `Order_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
