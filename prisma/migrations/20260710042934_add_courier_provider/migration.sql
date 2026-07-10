-- AlterTable
ALTER TABLE `order` ADD COLUMN `courierProvider` ENUM('STEADFAST', 'PATHAO', 'REDX') NULL;
