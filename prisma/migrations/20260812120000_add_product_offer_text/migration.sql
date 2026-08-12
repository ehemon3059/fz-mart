-- Offer strip copy shown under the price on the product page ("Buy 1 Get 1
-- Free"). Nullable with no default, so every existing product starts with no
-- strip and nothing about the current storefront changes until an admin fills
-- it in. The storefront renders it only while the product is discounted.
ALTER TABLE `Product` ADD COLUMN `offerText` VARCHAR(191) NULL;
