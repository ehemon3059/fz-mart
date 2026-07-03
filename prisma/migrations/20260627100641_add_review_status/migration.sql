-- AlterTable: replace boolean isApproved with a three-state status enum
ALTER TABLE `ProductReview` ADD COLUMN `status` ENUM('PENDING', 'APPROVED', 'HIDDEN') NOT NULL DEFAULT 'PENDING';

-- Backfill from the old boolean (no rows are HIDDEN yet, since that state didn't exist)
UPDATE `ProductReview` SET `status` = 'APPROVED' WHERE `isApproved` = 1;
UPDATE `ProductReview` SET `status` = 'PENDING' WHERE `isApproved` = 0;

-- DropIndex
DROP INDEX `ProductReview_productId_isApproved_createdAt_idx` ON `ProductReview`;

-- AlterTable
ALTER TABLE `ProductReview` DROP COLUMN `isApproved`;

-- CreateIndex
CREATE INDEX `ProductReview_productId_status_createdAt_idx` ON `ProductReview`(`productId`, `status`, `createdAt`);
