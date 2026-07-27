-- Steadfast test mode: mark shipments created by the local simulator.
--
-- Frozen at creation (like Order.courierProvider) so status refreshes and
-- webhooks always follow the mode the shipment was made in — switching the
-- setting to live must never send a simulated TEST- consignment id to the
-- real Steadfast API.
ALTER TABLE `CourierShipment` ADD COLUMN `isTest` BOOLEAN NOT NULL DEFAULT false;

-- Backfill: any pre-existing row with a TEST- consignment id (there should be
-- none, but the id prefix is the fallback signal the code also checks).
UPDATE `CourierShipment` SET `isTest` = true WHERE `consignmentId` LIKE 'TEST-%';
