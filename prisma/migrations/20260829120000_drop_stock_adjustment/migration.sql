-- Retire the deprecated StockAdjustment table.
--
-- StockMovement superseded it in migration 20260816120000: the ledger records
-- EVERY stock change rather than only hand corrections, and its rows were
-- copied across at that time. The table was kept read-only afterwards purely as
-- a safety net, so the copy could be checked against the original before this
-- point.
--
-- Verified empty before dropping (0 rows), so nothing is lost here. Nothing in
-- the application has referenced it since the cutover.

DROP TABLE IF EXISTS `StockAdjustment`;
