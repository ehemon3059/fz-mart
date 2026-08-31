-- Two more shipment-level costs on a purchase order: labour and miscellaneous.
--
-- The two that existed (freight, customs) were modelled on an imported
-- container, which is the minority case here. Most deliveries this shop takes
-- are domestic: no freight invoice, no customs at all, but always someone paid
-- to load the truck at one end and unload it at the other, and usually a
-- handful of small costs — tolls, tips, a rickshaw for the last hundred yards
-- — that are real money and belong to the delivery rather than to any one
-- product on it.
--
-- Those costs were previously either lost, or smuggled into the freight box,
-- where they distorted the one figure that is supposed to mean freight. Landed
-- cost is what these columns feed, and landed cost is what margin is measured
-- against, so a cost that has nowhere to go is a margin that reads too high.
--
--   labourCost — load/unload labour (লেবার খরচ)
--   miscCost   — anything else the delivery cost (বিবিধ খরচ)
--
-- All four shipment costs are independent and optional. Zero means "this
-- shipment did not incur that cost", which is why the columns default to 0 and
-- why the form leaves every one of them blank rather than requiring a figure.

ALTER TABLE `PurchaseOrder`
  ADD COLUMN `labourCost` INT NOT NULL DEFAULT 0,
  ADD COLUMN `miscCost`   INT NOT NULL DEFAULT 0;

-- Nothing to backfill. Existing orders were written by a form that could not
-- capture these costs, so 0 is not a placeholder for an unknown figure — it is
-- the only thing the record can honestly say. Anything else would be inventing
-- expenses that were never entered, and would silently move the landed cost of
-- goods already sold.
