-- Bundle P — searchable encryption for Contact.email + Contact.phone.
--
-- Two new VARCHAR(64) columns hold HMAC-SHA-256(value, BLIND_INDEX_SECRET)
-- of the normalised email / phone. Lookups are by hash (exact match,
-- indexed); the actual values in `email` / `phone` are at-rest
-- encrypted via lib/philly/pii.ts on the application side.
--
-- Idempotent — safe to re-run.

ALTER TABLE `Contact`
  ADD COLUMN IF NOT EXISTS `emailHash` VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS `phoneHash` VARCHAR(64) NULL;

CREATE INDEX IF NOT EXISTS `Contact_organizationId_emailHash_idx`
  ON `Contact` (`organizationId`, `emailHash`);

CREATE INDEX IF NOT EXISTS `Contact_organizationId_phoneHash_idx`
  ON `Contact` (`organizationId`, `phoneHash`);
