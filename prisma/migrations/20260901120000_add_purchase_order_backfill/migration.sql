-- Mark a purchase order as written after the fact.
--
-- Backs the Buy & Sell Equal screen, which exists because a product can reach
-- the storefront through a door that records no supply side at all: created on
-- the selling side, it has a price and a stock figure but no supplier, no
-- quantity bought and no cost. It sells fine and leaves no answer to "where did
-- this come from, and what did it cost us". Recording that answer afterwards
-- needs a purchase order — but one that behaves unlike every other.
--
-- Hence the flag, which carries two meanings that both matter:
--
-- 1. THE UNITS WERE NEVER RECEIVED THROUGH THE LEDGER. They were already on the
--    shelf; they are why the product reads 50 on hand in the first place. A
--    backfill therefore writes its lines already-received and moves no stock,
--    because receiving them again would leave the shop believing it holds 100.
--    This is the only place in purchasing where receivedQty rises without a
--    matching StockMovement, and the flag is what says so out loud.
--
-- 2. THE COST IS RECALLED, NOT CAPTURED. A figure typed in months later is
--    weaker evidence than one taken off an invoice on the day. Margin reports
--    can lean on it while still being able to show which numbers are firm.
--
-- Stored rather than inferred from dates: an ordinary order can also be entered
-- late, and guessing from timestamps would quietly mislabel it.

ALTER TABLE `PurchaseOrder`
  ADD COLUMN `isBackfill` BOOLEAN NOT NULL DEFAULT false;

-- No backfill of the flag itself. Every order that already exists was written
-- through the normal ordered-then-received path and did move stock through the
-- ledger, so false is not a default standing in for unknown — it is correct.
