-- Bundle AG — manual ordering for the Contact list.
--
-- Adds a nullable BIGINT column. NULL = unordered (fall back to
-- createdAt). Explicit values sort lower-first so a value of 1 puts
-- the contact at the top.
--
-- The reorder API writes monotonically increasing integers (taken
-- from createdAt epoch ms when the column was NULL), so a small
-- reorder doesn't require rewriting every row's order.
--
-- Idempotent.

ALTER TABLE `Contact`
  ADD COLUMN IF NOT EXISTS `displayOrder` BIGINT NULL;

CREATE INDEX IF NOT EXISTS `Contact_organizationId_displayOrder_idx`
  ON `Contact` (`organizationId`, `displayOrder`);
