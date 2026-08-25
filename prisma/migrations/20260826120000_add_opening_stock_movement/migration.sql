-- Opening stock as a first-class movement type.
--
-- Until now the product form wrote `stock` straight to the row, so the units a
-- product started life with existed nowhere in the ledger and
-- scripts/stock-ledger-verify.ts reported them as drift. OPENING gives that
-- first balance a real entry, which makes the ledger replayable from zero for
-- every product created from here on.
--
-- Deliberately NOT PURCHASE (no supplier order explains it) and NOT ADJUSTMENT
-- (nothing was mis-counted). Written once, at product creation.
--
-- Purely additive: widening an ENUM leaves every existing row untouched, and no
-- historical row can carry the new value.

ALTER TABLE `StockMovement`
  MODIFY COLUMN `type`
  ENUM('SALE', 'CANCEL_RESTOCK', 'RETURN', 'DAMAGE', 'PURCHASE', 'ADJUSTMENT', 'OPENING') NOT NULL;
