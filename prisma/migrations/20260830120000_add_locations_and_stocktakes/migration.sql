-- Stock locations and stock-take sessions (Phase F).
--
-- LOCATIONS ARE LABELS, NOT POOLS. Product.stock / ProductVariant.stock stay
-- single shop-wide figures, so availability, reservations and the anti-oversell
-- guard are completely untouched by this migration. A location records WHERE a
-- movement happened; a per-location balance is derived by summing the ledger.
--
-- Splitting stock per location would instead mean rewriting reservations,
-- checkout availability and every inventory report, and answering "which
-- location fulfils this order?" — a question a single-counter shop doesn't have.
--
-- All additive: one nullable column on StockMovement, three new tables.

CREATE TABLE `StockLocation` (
  `id`        INT NOT NULL AUTO_INCREMENT,
  `name`      VARCHAR(191) NOT NULL,
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `isActive`  BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `note`      TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `StockLocation_name_key` (`name`),
  INDEX `StockLocation_isActive_sortOrder_idx` (`isActive`, `sortOrder`),
  PRIMARY KEY (`id`)
);

CREATE TABLE `StockTake` (
  `id`          INT NOT NULL AUTO_INCREMENT,
  `reference`   VARCHAR(191) NOT NULL,
  `locationId`  INT NULL,
  `status`      ENUM('OPEN', 'COMMITTED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
  `note`        TEXT NULL,
  `actorName`   VARCHAR(191) NOT NULL,
  `startedAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `committedAt` DATETIME(3) NULL,
  `updatedAt`   DATETIME(3) NOT NULL,

  UNIQUE INDEX `StockTake_reference_key` (`reference`),
  INDEX `StockTake_status_startedAt_idx` (`status`, `startedAt`),
  PRIMARY KEY (`id`)
);

CREATE TABLE `StockTakeLine` (
  `id`           INT NOT NULL AUTO_INCREMENT,
  `stockTakeId`  INT NOT NULL,
  `productId`    INT NOT NULL,
  `variantId`    INT NULL,
  `productName`  VARCHAR(191) NOT NULL,
  `variantLabel` VARCHAR(191) NULL,
  `expectedQty`  INT NOT NULL,
  -- NULL means "on the sheet, not counted yet" — different from a counted zero.
  `countedQty`   INT NULL,
  `note`         VARCHAR(191) NULL,
  `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3) NOT NULL,

  -- Scanning the same barcode twice updates the count instead of adding a
  -- second line to argue with.
  UNIQUE INDEX `StockTakeLine_stockTakeId_productId_variantId_key` (`stockTakeId`, `productId`, `variantId`),
  INDEX `StockTakeLine_stockTakeId_idx` (`stockTakeId`),
  PRIMARY KEY (`id`)
);

-- Where each movement happened. Nullable: every row written before locations
-- existed genuinely has no answer, and inventing one would be a lie the
-- per-location reports would then repeat.
ALTER TABLE `StockMovement` ADD COLUMN `locationId` INT NULL;
CREATE INDEX `StockMovement_locationId_createdAt_idx` ON `StockMovement`(`locationId`, `createdAt`);

-- SetNull on both: deleting a location must never erase the fact that stock
-- moved, nor the record of a count that happened.
ALTER TABLE `StockMovement`
  ADD CONSTRAINT `StockMovement_locationId_fkey`
  FOREIGN KEY (`locationId`) REFERENCES `StockLocation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `StockTake`
  ADD CONSTRAINT `StockTake_locationId_fkey`
  FOREIGN KEY (`locationId`) REFERENCES `StockLocation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `StockTakeLine`
  ADD CONSTRAINT `StockTakeLine_stockTakeId_fkey`
  FOREIGN KEY (`stockTakeId`) REFERENCES `StockTake`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
