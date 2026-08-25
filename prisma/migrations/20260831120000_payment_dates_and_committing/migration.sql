-- Dated payments, and an atomic claim state for stock-takes.
--
-- Two unrelated correctness fixes that both need the same migration slot.
--
-- 1. Payment.paidAt / refundedAt
--
-- `updatedAt` tracks the most recent write to a row, so it cannot answer "when
-- did this money move?" — a payment taken in June and refunded in August
-- reports August for BOTH events. Cash-flow reporting read it anyway, so
-- refunding something today retroactively rewrote a month that had closed:
-- June's takings shrank, and its cash-on-delivery figure rose to a number that
-- was never true on the day. Separate stamps let each event keep its own date.
--
-- 2. StockTakeStatus.COMMITTING
--
-- Committing a stock-take checked status outside any transaction, applied its
-- lines one at a time, then forced COMMITTED unconditionally — so a count
-- recorded during the loop was saved and then closed out unapplied, and a
-- cancel during the loop was overwritten. Commit now claims OPEN -> COMMITTING
-- in a single conditional write; the existing guard on counting demands OPEN
-- and so rejects concurrent writes for free. An interrupted commit also stays
-- visibly stuck here rather than passing as a clean COMMITTED.

ALTER TABLE `Payment`
  ADD COLUMN `paidAt`     DATETIME(3) NULL,
  ADD COLUMN `refundedAt` DATETIME(3) NULL;

-- BACKFILL. Without this every historical payment has a NULL paidAt, drops out
-- of the cash-flow inflows entirely, and leaves its order reading as if the
-- whole total was collected in cash on delivery.
--
-- `updatedAt` is the best available answer for rows already settled: for a
-- SUCCESS payment it is the moment it succeeded, unless the row was touched
-- afterwards. Nothing touches a settled payment except a refund, handled below.
UPDATE `Payment` SET `paidAt` = `updatedAt` WHERE `status` = 'SUCCESS';

-- Already-refunded rows: updatedAt is the REFUND date, not the payment date.
-- Attribute the refund to it, and fall back to createdAt for the inflow — the
-- original success timestamp was overwritten and is not recoverable. For these
-- rows the inflow date is approximate; every payment taken from here on is
-- stamped exactly.
UPDATE `Payment`
   SET `refundedAt` = `updatedAt`,
       `paidAt`     = `createdAt`
 WHERE `status` = 'REFUNDED';

CREATE INDEX `Payment_status_paidAt_idx` ON `Payment` (`status`, `paidAt`);
CREATE INDEX `Payment_refundedAt_idx`    ON `Payment` (`refundedAt`);

-- Additive enum value; existing rows are unaffected.
ALTER TABLE `StockTake`
  MODIFY `status` ENUM('OPEN', 'COMMITTING', 'COMMITTED', 'CANCELLED') NOT NULL DEFAULT 'OPEN';
