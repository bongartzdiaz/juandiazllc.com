-- Bundle AL — manual ordering for the Deal list view.
--
-- Nullable BIGINT. NULL = unordered (fall back to createdAt desc).
-- Explicit values sort lower-first. Index keyed on (pipelineId,
-- displayOrder) so reorder queries within a pipeline stay fast.
--
-- Idempotent.

ALTER TABLE `Deal`
  ADD COLUMN IF NOT EXISTS `displayOrder` BIGINT NULL;

CREATE INDEX IF NOT EXISTS `Deal_pipelineId_displayOrder_idx`
  ON `Deal` (`pipelineId`, `displayOrder`);
