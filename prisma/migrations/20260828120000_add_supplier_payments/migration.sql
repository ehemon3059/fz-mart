-- Supplier payments: what has actually been paid against a purchase order.
--
-- A ledger rather than a `paidAmount` column, because suppliers here are paid
-- in instalments (an advance, then the balance on delivery) and "what do I
-- still owe?" is a question about a history, not a number someone overwrites.
--
-- Deliberately separate from the P&L. Profit is accrual-based — goods become a
-- cost when they are SOLD, not when the supplier is paid — so these rows answer
-- a different question and must not be double-counted as an expense.
--
-- Purely additive: a new table, no change to any existing one.

CREATE TABLE `SupplierPayment` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `purchaseOrderId` INT NOT NULL,
  -- Paisa, like every other money column in this schema.
  `amount`          INT NOT NULL,
  `paidOn`          DATETIME(3) NOT NULL,
  `method`          VARCHAR(191) NULL,
  `note`            TEXT NULL,
  `actorName`       VARCHAR(191) NOT NULL,
  `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `SupplierPayment_purchaseOrderId_paidOn_idx` (`purchaseOrderId`, `paidOn`)
);

-- Cascade: a purchase order that is deleted takes its payment history with it.
-- Only a DRAFT/CANCELLED order that received nothing can ever be deleted (see
-- deletePurchaseOrder), so this can never erase the record of a real delivery.
ALTER TABLE `SupplierPayment`
  ADD CONSTRAINT `SupplierPayment_purchaseOrderId_fkey`
  FOREIGN KEY (`purchaseOrderId`) REFERENCES `PurchaseOrder`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
