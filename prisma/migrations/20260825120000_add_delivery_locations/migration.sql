-- Admin-managed delivery locations: Division → District → Upazila.
--
-- Replaces the checkout's flat "pick a zone" radio list with the cascading
-- location dropdowns Bangladeshi shoppers expect, WITHOUT hardcoding either the
-- place names or the courier rates. Each level may carry its own shippingZoneId;
-- the charge is resolved most-specific-first (upazila → district → division →
-- the zone flagged isFallback), so the real courier rule — "Dhaka district is
-- inside-city, except Savar/Keraniganj/Dhamrai/Nawabganj/Dohar, which are
-- sub-urban" — is expressed as data, not as an `if` in the checkout form.
--
-- Additive and non-destructive: ShippingZone keeps its id/name/charge, so every
-- existing order, saved address and admin screen that references a zone is
-- untouched. The new columns on `Order` and `CustomerAddress` are all NULL-able,
-- so historical rows stay valid with no backfill.

-- ── One zone acts as the catch-all when no location in the chain names a zone.
ALTER TABLE `ShippingZone` ADD COLUMN `isFallback` BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX `ShippingZone_isFallback_idx` ON `ShippingZone`(`isFallback`);

CREATE TABLE `Division` (
  `id`             INTEGER NOT NULL AUTO_INCREMENT,
  -- Bangla display name shown in the checkout dropdown ("ঢাকা").
  `name`           VARCHAR(191) NOT NULL,
  -- Stable ASCII key: keeps the seed idempotent and survives a rename.
  `slug`           VARCHAR(191) NOT NULL,
  `shippingZoneId` INTEGER NULL,
  `isActive`       BOOLEAN NOT NULL DEFAULT true,
  `sortOrder`      INTEGER NOT NULL DEFAULT 0,
  `createdAt`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3) NOT NULL,

  UNIQUE INDEX `Division_slug_key`(`slug`),
  INDEX `Division_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `District` (
  `id`             INTEGER NOT NULL AUTO_INCREMENT,
  `divisionId`     INTEGER NOT NULL,
  `name`           VARCHAR(191) NOT NULL,
  `slug`           VARCHAR(191) NOT NULL,
  `shippingZoneId` INTEGER NULL,
  `isActive`       BOOLEAN NOT NULL DEFAULT true,
  `sortOrder`      INTEGER NOT NULL DEFAULT 0,
  `createdAt`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3) NOT NULL,

  UNIQUE INDEX `District_slug_key`(`slug`),
  INDEX `District_divisionId_isActive_sortOrder_idx`(`divisionId`, `isActive`, `sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Upazila` (
  `id`             INTEGER NOT NULL AUTO_INCREMENT,
  `districtId`     INTEGER NOT NULL,
  `name`           VARCHAR(191) NOT NULL,
  `slug`           VARCHAR(191) NOT NULL,
  `shippingZoneId` INTEGER NULL,
  `isActive`       BOOLEAN NOT NULL DEFAULT true,
  `sortOrder`      INTEGER NOT NULL DEFAULT 0,
  `createdAt`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3) NOT NULL,

  UNIQUE INDEX `Upazila_slug_key`(`slug`),
  INDEX `Upazila_districtId_isActive_sortOrder_idx`(`districtId`, `isActive`, `sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── Order: snapshot the chosen location as TEXT. Deliberately not FKs — a
-- courier label and an order's history must read exactly as placed even after
-- the admin renames or deletes the district.
ALTER TABLE `Order`
  ADD COLUMN `divisionName` VARCHAR(191) NULL,
  ADD COLUMN `districtName` VARCHAR(191) NULL,
  ADD COLUMN `upazilaName`  VARCHAR(191) NULL;

-- ── CustomerAddress: store the selection by id so the address book re-opens on
-- the exact dropdown values. SetNull keeps a saved address usable if a location
-- is later removed.
ALTER TABLE `CustomerAddress`
  ADD COLUMN `divisionId` INTEGER NULL,
  ADD COLUMN `districtId` INTEGER NULL,
  ADD COLUMN `upazilaId`  INTEGER NULL;

ALTER TABLE `Division`
  ADD CONSTRAINT `Division_shippingZoneId_fkey` FOREIGN KEY (`shippingZoneId`)
  REFERENCES `ShippingZone`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `District`
  ADD CONSTRAINT `District_divisionId_fkey` FOREIGN KEY (`divisionId`)
  REFERENCES `Division`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `District`
  ADD CONSTRAINT `District_shippingZoneId_fkey` FOREIGN KEY (`shippingZoneId`)
  REFERENCES `ShippingZone`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Upazila`
  ADD CONSTRAINT `Upazila_districtId_fkey` FOREIGN KEY (`districtId`)
  REFERENCES `District`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Upazila`
  ADD CONSTRAINT `Upazila_shippingZoneId_fkey` FOREIGN KEY (`shippingZoneId`)
  REFERENCES `ShippingZone`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `CustomerAddress`
  ADD CONSTRAINT `CustomerAddress_divisionId_fkey` FOREIGN KEY (`divisionId`)
  REFERENCES `Division`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CustomerAddress`
  ADD CONSTRAINT `CustomerAddress_districtId_fkey` FOREIGN KEY (`districtId`)
  REFERENCES `District`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CustomerAddress`
  ADD CONSTRAINT `CustomerAddress_upazilaId_fkey` FOREIGN KEY (`upazilaId`)
  REFERENCES `Upazila`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
