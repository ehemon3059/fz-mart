-- ============================================================================
-- Customer profile contact fields + saved address book.
--
--   1. Customer.phone / Customer.contactEmail — profile details edited from
--      /account/profile. Both nullable so every existing customer stays valid.
--      Customer.email (the sign-in identity) is deliberately untouched.
--   2. CustomerAddress — up to 3 saved delivery addresses per customer. The
--      3-address cap is application-enforced (server/customers/addresses.ts);
--      SQL has no row-count constraint to express it.
--
-- Purely additive: no backfill, no data loss.
-- ============================================================================

-- AlterTable
ALTER TABLE `Customer` ADD COLUMN `phone` VARCHAR(191) NULL,
    ADD COLUMN `contactEmail` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `CustomerAddress` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customerId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `address` TEXT NOT NULL,
    `shippingZoneId` INTEGER NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CustomerAddress_customerId_idx`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CustomerAddress` ADD CONSTRAINT `CustomerAddress_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
-- SET NULL, not CASCADE: deleting a shipping zone must not delete a customer's
-- address — the address stays and simply loses its pre-selected zone.
ALTER TABLE `CustomerAddress` ADD CONSTRAINT `CustomerAddress_shippingZoneId_fkey` FOREIGN KEY (`shippingZoneId`) REFERENCES `ShippingZone`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
