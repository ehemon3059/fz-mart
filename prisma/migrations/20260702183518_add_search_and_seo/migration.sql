-- AlterTable
ALTER TABLE `category` ADD COLUMN `metaDescription` TEXT NULL,
    ADD COLUMN `metaTitle` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `page` ADD COLUMN `metaDescription` TEXT NULL,
    ADD COLUMN `metaTitle` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `product` ADD COLUMN `metaDescription` TEXT NULL,
    ADD COLUMN `metaTitle` VARCHAR(191) NULL;

-- CreateIndex
CREATE FULLTEXT INDEX `Product_name_description_idx` ON `Product`(`name`, `description`);
