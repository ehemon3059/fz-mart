-- AlterTable
ALTER TABLE `order` ADD COLUMN `utmCampaign` VARCHAR(191) NULL,
    ADD COLUMN `utmMedium` VARCHAR(191) NULL,
    ADD COLUMN `utmSource` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `AdSpend` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `channel` ENUM('FACEBOOK', 'GOOGLE', 'TIKTOK', 'OTHER') NOT NULL DEFAULT 'FACEBOOK',
    `amount` INTEGER NOT NULL,
    `spentOn` DATETIME(3) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AdSpend_spentOn_idx`(`spentOn`),
    INDEX `AdSpend_channel_spentOn_idx`(`channel`, `spentOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
