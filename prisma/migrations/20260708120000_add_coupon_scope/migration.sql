-- AlterTable
ALTER TABLE `coupon` ADD COLUMN `appliesTo` ENUM('ALL', 'CATEGORY', 'PRODUCT') NOT NULL DEFAULT 'ALL',
    ADD COLUMN `categoryId` INTEGER NULL,
    ADD COLUMN `productId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Coupon_categoryId_idx` ON `Coupon`(`categoryId`);

-- CreateIndex
CREATE INDEX `Coupon_productId_idx` ON `Coupon`(`productId`);

-- AddForeignKey
ALTER TABLE `Coupon` ADD CONSTRAINT `Coupon_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Coupon` ADD CONSTRAINT `Coupon_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
