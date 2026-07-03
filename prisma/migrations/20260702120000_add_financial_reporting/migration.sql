-- AlterTable: snapshot + live sourcing cost for COGS
ALTER TABLE `Product` ADD COLUMN `purchaseCost` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `ProductVariant` ADD COLUMN `purchaseCost` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `OrderItem` ADD COLUMN `purchaseCost` INTEGER NOT NULL DEFAULT 0;

-- AlterTable: per-order real costs (paisa) + return disposition
ALTER TABLE `Order` ADD COLUMN `shippingCost` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `returnShippingCost` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `paymentGatewayFee` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `returnRestockable` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `Expense` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category` ENUM('MARKETING', 'SOFTWARE', 'RENT', 'SALARY', 'UTILITIES', 'PACKAGING', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `description` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `incurredOn` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Expense_incurredOn_idx`(`incurredOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
