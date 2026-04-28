-- Enterprise access controls (Bundle M).
--
-- Three nullable columns. All-NULL = legacy behaviour (no per-org
-- IP allowlist, no per-org idle-timeout, no per-user activity
-- tracking). Idempotent — every column uses IF NOT EXISTS so a
-- re-run on a partially-migrated environment is safe.

ALTER TABLE `Organization`
  ADD COLUMN IF NOT EXISTS `ipAllowlist` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `sessionIdleTimeoutMinutes` INT NULL;

ALTER TABLE `User`
  ADD COLUMN IF NOT EXISTS `lastActivityAt` DATETIME(3) NULL;
