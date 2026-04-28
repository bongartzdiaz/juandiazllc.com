-- Contact AI attributes (Attio-style).
--
-- Six nullable columns the LLM enrichment pipeline writes to:
-- aiIndustry, aiIcpFit, aiSummary, aiAttributesStatus,
-- aiAttributesUpdatedAt, aiAttributesError.
--
-- Persisted by lib/philly/ai/contact-attributes.ts. Read on the
-- contact detail page (components/philly/contacts/AiAttributesCard.tsx)
-- and re-generated on demand via POST /api/contacts/[id]/ai-attributes.
--
-- Idempotent: every column uses IF NOT EXISTS so re-running on a
-- branch that has already received some columns is safe.

ALTER TABLE `Contact`
  ADD COLUMN IF NOT EXISTS `aiIndustry` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `aiIcpFit` INT NULL,
  ADD COLUMN IF NOT EXISTS `aiSummary` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `aiAttributesStatus` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `aiAttributesUpdatedAt` DATETIME(3) NULL,
  ADD COLUMN IF NOT EXISTS `aiAttributesError` TEXT NULL;
