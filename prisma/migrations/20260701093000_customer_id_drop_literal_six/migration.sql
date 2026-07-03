-- Re-key existing customer ids from the interim `fz-6-XXXXXXXX` shape to the
-- intended `fz-XXXXXX` shape (prefix `fz-` + 6 random-looking alphanumerics).
-- The suffix is derived deterministically from the current id so the parent and
-- its referencing rows map to the same new value without a temp mapping table.
-- Column types are unchanged (already VARCHAR); we only rewrite the values, so
-- the foreign keys are dropped and restored around the updates.

ALTER TABLE `Order` DROP FOREIGN KEY `Order_customerId_fkey`;
ALTER TABLE `ProductReview` DROP FOREIGN KEY `ProductReview_customerId_fkey`;

-- Update children first while they still hold the old id value.
UPDATE `Order`
  SET `customerId` = CONCAT('fz-', UPPER(SUBSTRING(MD5(CONCAT('customer:', `customerId`)), 1, 6)))
  WHERE `customerId` IS NOT NULL;

UPDATE `ProductReview`
  SET `customerId` = CONCAT('fz-', UPPER(SUBSTRING(MD5(CONCAT('customer:', `customerId`)), 1, 6)));

UPDATE `Customer`
  SET `id` = CONCAT('fz-', UPPER(SUBSTRING(MD5(CONCAT('customer:', `id`)), 1, 6)));

ALTER TABLE `ProductReview` ADD CONSTRAINT `ProductReview_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Order` ADD CONSTRAINT `Order_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
