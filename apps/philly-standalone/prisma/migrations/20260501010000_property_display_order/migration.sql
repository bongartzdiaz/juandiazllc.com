-- Bundle BR — Property.displayOrder for drag-drop reorder
--
-- Mirrors Contact.displayOrder (Bundle AG, migration
-- 20260429000000_contact_display_order) and Deal.displayOrder
-- (Bundle AL, migration 20260429010000_deal_display_order).
-- NULL = unsorted; the grid renders ascending; the
-- /api/properties/reorder endpoint writes 1..N inside a transaction.

ALTER TABLE "Property"
  ADD COLUMN IF NOT EXISTS "displayOrder" BIGINT;

CREATE INDEX IF NOT EXISTS "Property_organizationId_displayOrder_idx"
  ON "Property" ("organizationId", "displayOrder");
