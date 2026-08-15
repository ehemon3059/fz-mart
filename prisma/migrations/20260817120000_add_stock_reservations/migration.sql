-- Phase D of the inventory rebuild: On Hand / Reserved / Available.
--
-- Until now checkout took units straight off the shelf, so `stock` conflated
-- "what is in the warehouse" with "what is still sellable" — a COD order left
-- sitting unconfirmed for three days made its units invisible the whole time.
--
-- From here:
--   stock     = ON HAND, physically in the warehouse
--   reserved  = promised to orders that have neither shipped nor died
--   available = stock - reserved, which is what the storefront sells against
--
-- Units now leave `stock` when the parcel SHIPS, not at checkout.

ALTER TABLE `Product` ADD COLUMN `reserved` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `ProductVariant` ADD COLUMN `reserved` INTEGER NOT NULL DEFAULT 0;

-- fulfilledAt marks the reservation as CONSUMED (the parcel shipped). Together
-- with restockedAt it makes the lifecycle explicit and idempotent: an order can
-- be fulfilled or released, never both, and never twice.
ALTER TABLE `Order` ADD COLUMN `fulfilledAt` DATETIME(3) NULL;

-- ── Backfill: reconstruct the reservation state of live orders ──────────────
--
-- Under the old model every live order had ALREADY decremented stock. Under the
-- new one those units should be on the shelf AND reserved. So for each order
-- still holding units, put the units back into `stock` and record them as
-- reserved — the net available position is unchanged, which is what makes this
-- migration safe to run against a live shop.
--
-- Orders that already shipped or delivered are different: their units are
-- genuinely gone. They are marked fulfilled instead, leaving stock alone.

-- 1. Orders whose reservation is still open (never shipped, never released).
--    Credit stock back and mirror it into reserved.
UPDATE `Product` p
JOIN (
  SELECT oi.`productId` AS pid, SUM(oi.`quantity`) AS qty
  FROM `OrderItem` oi
  JOIN `Order` o ON o.`id` = oi.`orderId`
  WHERE oi.`productId` IS NOT NULL
    AND oi.`variantId` IS NULL
    AND o.`restockedAt` IS NULL
    AND o.`status` IN ('PENDING_PAYMENT', 'PENDING', 'CONFIRMED')
  GROUP BY oi.`productId`
) r ON r.pid = p.`id`
SET p.`stock` = p.`stock` + r.qty,
    p.`reserved` = p.`reserved` + r.qty;

UPDATE `ProductVariant` v
JOIN (
  SELECT oi.`variantId` AS vid, SUM(oi.`quantity`) AS qty
  FROM `OrderItem` oi
  JOIN `Order` o ON o.`id` = oi.`orderId`
  WHERE oi.`variantId` IS NOT NULL
    AND o.`restockedAt` IS NULL
    AND o.`status` IN ('PENDING_PAYMENT', 'PENDING', 'CONFIRMED')
  GROUP BY oi.`variantId`
) r ON r.vid = v.`id`
SET v.`stock` = v.`stock` + r.qty,
    v.`reserved` = v.`reserved` + r.qty;

-- 2. Orders that shipped or were delivered: their units really did leave the
--    shelf, so `stock` is already correct. Mark the reservation as consumed so
--    a later RETURNED transition credits stock instead of trying to free a
--    reservation that no longer exists.
--
--    Timestamped from the SHIPPED status-log entry where one exists, so the
--    marker reflects when the parcel actually went out.
UPDATE `Order` o
LEFT JOIN (
  SELECT `orderId`, MIN(`createdAt`) AS shippedAt
  FROM `OrderStatusLog`
  WHERE `toStatus` = 'SHIPPED'
  GROUP BY `orderId`
) l ON l.`orderId` = o.`id`
SET o.`fulfilledAt` = COALESCE(l.shippedAt, o.`updatedAt`)
WHERE o.`status` IN ('SHIPPED', 'DELIVERED')
  AND o.`restockedAt` IS NULL;

-- 3. Orders already RETURNED or CANCELLED from a shipped state carry a
--    restockedAt (set in the Step 0 migration) and their stock was credited
--    back by the old code. They shipped first, so record that too — otherwise
--    the lifecycle would claim units were released that had in fact gone out.
UPDATE `Order` o
JOIN (
  SELECT `orderId`, MIN(`createdAt`) AS shippedAt
  FROM `OrderStatusLog`
  WHERE `toStatus` = 'SHIPPED'
  GROUP BY `orderId`
) l ON l.`orderId` = o.`id`
SET o.`fulfilledAt` = l.shippedAt
WHERE o.`fulfilledAt` IS NULL
  AND o.`status` IN ('RETURNED', 'CANCELLED');
