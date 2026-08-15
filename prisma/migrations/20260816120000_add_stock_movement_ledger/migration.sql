-- Phase A of the inventory rebuild: the complete stock ledger.
--
-- Before this, only MANUAL corrections were recorded (StockAdjustment). Sales,
-- restocks and returns moved stock silently, so "why is this number 97?" had no
-- answer. StockMovement records every change from every source; Product.stock
-- and ProductVariant.stock become a cache of its running sum.
--
-- Steps: create the table, copy the old manual rows across, then backfill
-- history from existing orders so the reports in Phase B have a past to read.

CREATE TABLE `StockMovement` (
  `id`        INTEGER NOT NULL AUTO_INCREMENT,
  `productId` INTEGER NOT NULL,
  `variantId` INTEGER NULL,
  `type`      ENUM('SALE', 'CANCEL_RESTOCK', 'RETURN', 'DAMAGE', 'PURCHASE', 'ADJUSTMENT') NOT NULL,
  `delta`     INTEGER NOT NULL,
  `beforeQty` INTEGER NOT NULL,
  `afterQty`  INTEGER NOT NULL,
  `unitCost`  INTEGER NULL,
  `orderId`   INTEGER NULL,
  `reason`    VARCHAR(191) NULL,
  `actorName` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `StockMovement_productId_createdAt_idx`(`productId`, `createdAt`),
  INDEX `StockMovement_variantId_createdAt_idx`(`variantId`, `createdAt`),
  INDEX `StockMovement_orderId_idx`(`orderId`),
  INDEX `StockMovement_type_createdAt_idx`(`type`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `StockMovement`
  ADD CONSTRAINT `StockMovement_productId_fkey`
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- SetNull, not Cascade: variants are wiped and recreated on every product save,
-- so a movement routinely outlives the variant row it named. It keeps its
-- productId, so per-product history stays complete.
ALTER TABLE `StockMovement`
  ADD CONSTRAINT `StockMovement_variantId_fkey`
  FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Likewise: deleting an order must never erase the fact that stock moved.
ALTER TABLE `StockMovement`
  ADD CONSTRAINT `StockMovement_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Copy the existing manual corrections ────────────────────────────────────
-- StockAdjustment stored `newStock` but not the level before, so beforeQty is
-- derived: before = after − delta. That identity always held for these rows,
-- since each one recorded a single applied change.
INSERT INTO `StockMovement`
  (`productId`, `variantId`, `type`, `delta`, `beforeQty`, `afterQty`, `unitCost`, `orderId`, `reason`, `actorName`, `createdAt`)
SELECT
  `productId`,
  `variantId`,
  'ADJUSTMENT',
  `delta`,
  `newStock` - `delta`,
  `newStock`,
  NULL,             -- old rows carry no cost basis
  NULL,
  `reason`,
  `adminName`,
  `createdAt`
FROM `StockAdjustment`;

-- ── Backfill SALE history from existing orders ──────────────────────────────
-- Every order line took units off the shelf at checkout, so each one is a SALE.
-- This gives velocity, best-seller and dead-stock reports real history to read
-- from day one instead of starting empty.
--
-- beforeQty/afterQty are recorded as 0: the true levels at those historical
-- moments are unknowable now (the checkout that ran them recorded nothing). The
-- delta IS accurate, which is what every report actually sums. The verify
-- script knows to treat pre-cutover rows as deltas only — see
-- scripts/stock-ledger-verify.ts.
--
-- Cancelled/returned orders are included: they genuinely did take stock at
-- checkout. Their matching restock, where it happened, is backfilled below.
INSERT INTO `StockMovement`
  (`productId`, `variantId`, `type`, `delta`, `beforeQty`, `afterQty`, `unitCost`, `orderId`, `reason`, `actorName`, `createdAt`)
SELECT
  oi.`productId`,
  oi.`variantId`,
  'SALE',
  -oi.`quantity`,
  0,
  0,
  oi.`purchaseCost`,
  oi.`orderId`,
  'Backfilled from order history',
  'system',
  o.`createdAt`
FROM `OrderItem` oi
JOIN `Order` o ON o.`id` = oi.`orderId`
WHERE oi.`productId` IS NOT NULL;

-- ── Backfill the restocks that actually happened ────────────────────────────
-- Order.restockedAt (added in the previous migration) marks the orders whose
-- units were genuinely returned to the shelf. Only those get a reversing row —
-- orders lost to the cancel-restock bug are deliberately left without one, so
-- the ledger keeps showing the units as gone, which is the truth on the shelf.
INSERT INTO `StockMovement`
  (`productId`, `variantId`, `type`, `delta`, `beforeQty`, `afterQty`, `unitCost`, `orderId`, `reason`, `actorName`, `createdAt`)
SELECT
  oi.`productId`,
  oi.`variantId`,
  CASE WHEN o.`status` = 'RETURNED' THEN 'RETURN' ELSE 'CANCEL_RESTOCK' END,
  oi.`quantity`,
  0,
  0,
  oi.`purchaseCost`,
  oi.`orderId`,
  'Backfilled from order history',
  'system',
  o.`restockedAt`
FROM `OrderItem` oi
JOIN `Order` o ON o.`id` = oi.`orderId`
WHERE oi.`productId` IS NOT NULL
  AND o.`restockedAt` IS NOT NULL;
