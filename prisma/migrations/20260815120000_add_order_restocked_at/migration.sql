-- Step 0 of the inventory rebuild: make stock release correct and idempotent.
--
-- Background: units are decremented at CHECKOUT, so every live order holds
-- stock. Before this change only PENDING_PAYMENT orders gave those units back
-- when cancelled, so a cancelled COD order (the common case) leaked its stock
-- permanently. `restockedAt` is the marker that an order's units have been
-- returned to the shelf, and the conditional-update guard that makes the
-- release happen at most once across the racing paths that can trigger it
-- (admin cancel, customer self-cancel, payment expiry job, gateway failure IPN).

ALTER TABLE `Order` ADD COLUMN `restockedAt` DATETIME(3) NULL;

-- Backfill the orders whose stock the OLD code already released, so the new
-- idempotency guard cannot credit them a second time.
--
-- That was exactly one path: PENDING_PAYMENT → CANCELLED. Identified from the
-- status log rather than the current status, because it records the transition
-- that actually ran. Timestamped with the log row so the marker reflects when
-- the release really happened.
--
-- Orders cancelled from PENDING/CONFIRMED/SHIPPED are deliberately LEFT NULL:
-- their stock was never returned (that is the bug being fixed), so they stay
-- eligible. Nothing here re-credits them — historical drift is reported
-- separately by scripts/stock-drift-report.ts and corrected only on request.
UPDATE `Order` o
JOIN (
  SELECT `orderId`, MIN(`createdAt`) AS releasedAt
  FROM `OrderStatusLog`
  WHERE `fromStatus` = 'PENDING_PAYMENT' AND `toStatus` = 'CANCELLED'
  GROUP BY `orderId`
) l ON l.`orderId` = o.`id`
SET o.`restockedAt` = l.releasedAt;
