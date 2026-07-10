-- CreateTable
CREATE TABLE `FunnelEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('PRODUCT_VIEW', 'ADD_TO_CART', 'CHECKOUT_START', 'ORDER_PLACED') NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `productId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FunnelEvent_type_createdAt_idx`(`type`, `createdAt`),
    INDEX `FunnelEvent_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
