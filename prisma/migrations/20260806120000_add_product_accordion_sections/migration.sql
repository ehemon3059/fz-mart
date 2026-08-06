-- Collapsible panels for the product page's "Features & Specs" tab, authored in
-- the admin's Accordion Builder. Purely additive: no existing product has rows
-- here, so every product keeps rendering its flat Markdown description until an
-- admin actually builds an accordion for it.
--
-- `content` is Markdown (TEXT — spec tables and long prose outrun VARCHAR).
-- `icon` holds a leading emoji and is nullable ("no icon" renders the title
-- alone). Cascade delete mirrors the other Product child tables.

-- CreateTable
CREATE TABLE `ProductAccordionSection` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NULL,
    `content` TEXT NOT NULL,
    `isOpen` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `ProductAccordionSection_productId_sortOrder_idx`(`productId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProductAccordionSection` ADD CONSTRAINT `ProductAccordionSection_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
