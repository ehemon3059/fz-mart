-- Listed quantity: how many of the units on hand are authorised for sale.
--
-- The gap this closes: a shop that buys 100 units has, until now, had exactly
-- one thing it could do with them — offer all 100 on the storefront. There was
-- no way to buy a hundred and sell fifty, holding the rest back for a later
-- drop, a wholesale order, or simply because the shop does not want its whole
-- position on the shelf at once. The only workarounds were both wrong: a second
-- product row (which duplicates the listing, splitting reviews and SEO across
-- two cards for one physical good), or receiving the purchase order in
-- instalments (which lies about when the goods physically arrived, and leaves
-- the ledger disagreeing with the warehouse).
--
-- So the split is recorded where it actually belongs — on the CATALOGUE, next
-- to the other decisions about how a product is offered. Two rules keep this
-- from becoming a second, competing stock system:
--
--   1. It never moves goods. Changing this column writes no StockMovement,
--      because nothing physical happened; the change is audited in
--      AdminActivityLog instead. `stock` remains the sole property of the
--      ledger, and scripts/stock-ledger-verify.ts is unaffected by this column.
--
--   2. It can only ever REMOVE units from sale, never add them:
--
--        WEBSITE AVAILABLE = min(stock − reserved, listedQty ?? ∞)
--
--      so a cap can never conjure stock the shelf does not have. The existing
--      anti-oversell guard is extended with it rather than replaced.
--
-- Lifecycle mirrors `reserved` exactly, which is what makes it read as "how
-- many more may still be sold": checkout takes N from it as it reserves them, a
-- cancelled order credits them back, and shipping consumes them for good.
--
-- NULLABLE, and null means UNCAPPED — sell everything available. That is the
-- pre-existing behaviour, so every product that exists today keeps it and this
-- migration changes no product's availability by a single unit. A cap only
-- exists where an admin has deliberately set one.

ALTER TABLE `Product`
  ADD COLUMN `listedQty` INT NULL;

ALTER TABLE `ProductVariant`
  ADD COLUMN `listedQty` INT NULL;

-- Deliberately no backfill. Writing a number here for existing rows would be
-- inventing a decision no admin has made — and setting it to the current stock
-- would be worse than leaving it null, because the two then drift apart the
-- moment the next purchase order is received: stock rises, the frozen cap does
-- not, and the shop silently stops selling goods it just paid for.
