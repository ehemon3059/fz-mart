-- DropIndex
DROP INDEX `Banner_isActive_sortOrder_idx` ON `banner`;

-- AlterTable
ALTER TABLE `banner` ADD COLUMN `slot` ENUM('MAIN', 'RIGHT_TOP', 'RIGHT_BOTTOM') NOT NULL DEFAULT 'MAIN';

-- CreateIndex
CREATE INDEX `Banner_slot_isActive_sortOrder_idx` ON `Banner`(`slot`, `isActive`, `sortOrder`);
