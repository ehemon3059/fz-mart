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
--    (Prisma's default String length on MySQL). Existing integers become their
--    decimal string form ('1', '2', '4'), so references still match textually.
--
--    TiDB builds the primary key as a CLUSTERED index, which can neither be
--    dropped nor retyped in place (error 8200: "Unsupported modify column: this
--    column has primary key flag" / "Unsupported drop primary key when the table
--    is using clustered index"). MySQL's plain `MODIFY` therefore cannot work
--    here, so Customer is rebuilt: create the retyped table, copy every row
--    across casting the id to text, drop the original, and rename into place.
--    Order/ProductReview keep plain MODIFY -- customerId is not their PK.
CREATE TABLE `Customer_new` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `provider` ENUM('GOOGLE','EMAIL') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Customer_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `Customer_new` (`id`, `email`, `name`, `avatarUrl`, `provider`, `createdAt`)
    SELECT CAST(`id` AS CHAR), `email`, `name`, `avatarUrl`, `provider`, `createdAt` FROM `Customer`;

DROP TABLE `Customer`;
RENAME TABLE `Customer_new` TO `Customer`;

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
