-- Size guides + SKUs.
--
-- A SizeGuide is a reusable TEMPLATE: the size chips a shopper picks from, the
-- label above them ("Select Bust Size:"), and the markdown chart behind the
-- "Size Chart" link. It is attached to a Category and inherited down the tree,
-- so "Blouse / bust sizes" (32…52) is typed once and every blouse below that
-- node gets the same chips in the same order. A Product can override with its
-- own guide, or with a one-off sizeLabel/sizeChart.
--
-- Sellable stock is untouched: the actual colour × size combinations still live
-- in ProductVariant. Deleting a guide only unsets the pointers (SET NULL), so
-- no product can lose its variants this way.
--
-- ProductVariant.sku is unique shop-wide when set and null everywhere else.
-- Variants are wiped and recreated on every product save, so the admin form has
-- to round-trip this column rather than regenerate it — a re-save must never
-- renumber a shop's inventory.
--
-- Purely additive: every new column is nullable, no backfill, and nothing reads
-- these yet.

-- CreateTable
CREATE TABLE `SizeGuide` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `sizeLabel` VARCHAR(191) NULL,
    `chart` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SizeGuideValue` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `guideId` INTEGER NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `SizeGuideValue_guideId_sortOrder_idx`(`guideId`, `sortOrder`),
    UNIQUE INDEX `SizeGuideValue_guideId_value_key`(`guideId`, `value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `Category` ADD COLUMN `sizeGuideId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Product` ADD COLUMN `baseSku` VARCHAR(191) NULL,
    ADD COLUMN `sizeChart` TEXT NULL,
    ADD COLUMN `sizeGuideId` INTEGER NULL,
    ADD COLUMN `sizeLabel` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ProductVariant` ADD COLUMN `sku` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Category_sizeGuideId_idx` ON `Category`(`sizeGuideId`);

-- CreateIndex
CREATE INDEX `Product_sizeGuideId_idx` ON `Product`(`sizeGuideId`);

-- CreateIndex
CREATE INDEX `Product_baseSku_idx` ON `Product`(`baseSku`);

-- CreateIndex
CREATE UNIQUE INDEX `ProductVariant_sku_key` ON `ProductVariant`(`sku`);

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_sizeGuideId_fkey` FOREIGN KEY (`sizeGuideId`) REFERENCES `SizeGuide`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_sizeGuideId_fkey` FOREIGN KEY (`sizeGuideId`) REFERENCES `SizeGuide`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SizeGuideValue` ADD CONSTRAINT `SizeGuideValue_guideId_fkey` FOREIGN KEY (`guideId`) REFERENCES `SizeGuide`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
