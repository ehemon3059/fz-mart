-- DRAFT product status.
--
-- A purchase order needs a product row to reference before anyone has
-- photographed or priced the goods. DRAFT is that state: orderable and
-- receivable, but never on the storefront and not publishable until it has an
-- image and a price.
--
-- Safe by construction: every storefront, feed, sitemap, coupon and checkout
-- query filters FOR `status = 'ACTIVE'` rather than excluding 'INACTIVE', so a
-- DRAFT product is invisible to all of them without another line of code.
--
-- Purely additive: widening an ENUM leaves every existing row untouched, and no
-- historical row can carry the new value.

ALTER TABLE `Product`
  MODIFY COLUMN `status` ENUM('ACTIVE', 'INACTIVE', 'DRAFT') NOT NULL DEFAULT 'ACTIVE';
