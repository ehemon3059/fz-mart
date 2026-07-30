-- Backfill ProductVariant.imageUrl from the legacy per-variant gallery tag.
--
-- Before 20260729120000_add_variant_image, a variant's photo was stored as a
-- ProductImage row tagged with the variant's display label ("Navy / M", or just
-- "M" for a size-only row). The storefront and the admin form now read
-- ProductVariant.imageUrl only, so those tagged photos were orphaned: the
-- Sizes/Variants rows of every pre-existing product showed no photo, and the
-- product page no longer swapped the image when a shopper picked an option.
--
-- Copy the tag over to the new column. The photos stay in the gallery (they are
-- the only photos some of these products have); this only restores the link.
-- Only rows with no photo of their own are touched, so re-running is harmless.
UPDATE `ProductVariant` `v`
JOIN `ProductImage` `i`
  ON `i`.`productId` = `v`.`productId`
 AND `i`.`variantLabel` IS NOT NULL
 AND LOWER(TRIM(`i`.`variantLabel`)) = LOWER(TRIM(CONCAT_WS(
       ' / ',
       NULLIF(TRIM(COALESCE(`v`.`colorName`, '')), ''),
       NULLIF(TRIM(COALESCE(`v`.`size`, '')), '')
     )))
SET `v`.`imageUrl` = `i`.`url`
WHERE `v`.`imageUrl` IS NULL;
