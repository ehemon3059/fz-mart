-- Phase E of the inventory rebuild: suppliers, purchase orders, incoming stock.
--
-- Completes the picture the stock overview was missing: not just what you hold
-- and what is promised away, but what is on its way to you.
--
-- Receiving a purchase order writes a PURCHASE movement through the same ledger
-- as every other stock change, so incoming goods are not a special case — they
-- arrive, stock rises, and StockMovement says why.
--
-- Purely additive: no existing table is altered and no existing row is touched,
-- so this migration cannot disturb current stock or orders.

CREATE TABLE `Supplier` (
  `id`           INTEGER NOT NULL AUTO_INCREMENT,
  `name`         VARCHAR(191) NOT NULL,
  `phone`        VARCHAR(191) NULL,
  `email`        VARCHAR(191) NULL,
  `address`      TEXT NULL,
  `note`         TEXT NULL,
  -- Typical days from order to delivery. Feeds the reorder-point calculation,
  -- which otherwise falls back to one global default for every product.
  `leadTimeDays` INTEGER NULL,
  `isActive`     BOOLEAN NOT NULL DEFAULT true,
  `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3) NOT NULL,

  INDEX `Supplier_isActive_name_idx`(`isActive`, `name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PurchaseOrder` (
  `id`           INTEGER NOT NULL AUTO_INCREMENT,
  `poNo`         VARCHAR(191) NOT NULL,
  `supplierId`   INTEGER NOT NULL,
  `status`       ENUM('DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `expectedOn`   DATETIME(3) NULL,
  -- Shipment-level costs, apportioned across lines by value at receipt so each
  -- product's landed cost reflects what it really cost to get here.
  `shippingCost` INTEGER NOT NULL DEFAULT 0,
  `customsCost`  INTEGER NOT NULL DEFAULT 0,
  `note`         TEXT NULL,
  `orderedAt`    DATETIME(3) NULL,
  `receivedAt`   DATETIME(3) NULL,
  `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3) NOT NULL,

  UNIQUE INDEX `PurchaseOrder_poNo_key`(`poNo`),
  INDEX `PurchaseOrder_status_expectedOn_idx`(`status`, `expectedOn`),
  INDEX `PurchaseOrder_supplierId_idx`(`supplierId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PurchaseOrderLine` (
  `id`              INTEGER NOT NULL AUTO_INCREMENT,
  `purchaseOrderId` INTEGER NOT NULL,
  `productId`       INTEGER NOT NULL,
  `variantId`       INTEGER NULL,
  -- Snapshots, so a later product rename doesn't rewrite paperwork already sent
  -- to the supplier.
  `productName`     VARCHAR(191) NOT NULL,
  `variantLabel`    VARCHAR(191) NULL,
  `quantity`        INTEGER NOT NULL,
  -- Received so far; quantity − receivedQty is what is still INCOMING.
  `receivedQty`     INTEGER NOT NULL DEFAULT 0,
  `unitCost`        INTEGER NOT NULL,

  INDEX `PurchaseOrderLine_purchaseOrderId_idx`(`purchaseOrderId`),
  INDEX `PurchaseOrderLine_productId_idx`(`productId`),
  INDEX `PurchaseOrderLine_variantId_idx`(`variantId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Restrict: a supplier with purchase orders can't be deleted — those orders
-- would lose their attribution. The admin UI offers deactivation instead.
ALTER TABLE `PurchaseOrder`
  ADD CONSTRAINT `PurchaseOrder_supplierId_fkey`
  FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Cascade: deleting a purchase order takes its lines with it. They have no
-- meaning apart from their order, and a draft is routinely discarded.
ALTER TABLE `PurchaseOrderLine`
  ADD CONSTRAINT `PurchaseOrderLine_purchaseOrderId_fkey`
  FOREIGN KEY (`purchaseOrderId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Restrict: a product that appears on a purchase order can't be deleted while
-- that paperwork exists.
ALTER TABLE `PurchaseOrderLine`
  ADD CONSTRAINT `PurchaseOrderLine_productId_fkey`
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- SetNull: variants are wiped and recreated on every product save, so a line
-- routinely outlives the variant row it named. It keeps productId, so the order
-- stays readable.
ALTER TABLE `PurchaseOrderLine`
  ADD CONSTRAINT `PurchaseOrderLine_variantId_fkey`
  FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
