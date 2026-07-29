-- Per-variant photo, uploaded from the admin product form.
-- Nullable: existing variants keep showing their colour's ProductColor.imageUrl
-- (or nothing) until an admin uploads a photo for the row.
ALTER TABLE `ProductVariant` ADD COLUMN `imageUrl` VARCHAR(191) NULL;
