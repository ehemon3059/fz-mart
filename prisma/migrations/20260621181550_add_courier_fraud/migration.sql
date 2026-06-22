-- CreateTable
CREATE TABLE `CourierShipment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `courierName` VARCHAR(191) NOT NULL,
    `consignmentId` VARCHAR(191) NOT NULL,
    `trackingCode` VARCHAR(191) NULL,
    `courierStatus` VARCHAR(191) NOT NULL,
    `lastSyncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CourierShipment_orderId_key`(`orderId`),
    UNIQUE INDEX `CourierShipment_consignmentId_key`(`consignmentId`),
    INDEX `CourierShipment_consignmentId_idx`(`consignmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FraudCheckResult` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `phone` VARCHAR(191) NOT NULL,
    `totalOrders` INTEGER NOT NULL DEFAULT 0,
    `successOrders` INTEGER NOT NULL DEFAULT 0,
    `returnOrders` INTEGER NOT NULL DEFAULT 0,
    `riskScore` INTEGER NOT NULL,
    `checkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `FraudCheckResult_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CourierShipment` ADD CONSTRAINT `CourierShipment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
