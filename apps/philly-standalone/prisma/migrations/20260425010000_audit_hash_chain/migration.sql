-- Tamper-evident audit log: each AuditLog row commits to its predecessor
-- via SHA-256 of (prevHash || canonicalJson(row)). Modifying or deleting
-- a row breaks the chain at the verifier. Computed in lib/philly/audit.ts.
--
-- prevHash = most recent existing row's `hash` for the same organization,
--            null for the first row in the chain
-- hash     = SHA-256 hex digest, 64 chars

ALTER TABLE `AuditLog`
  ADD COLUMN `prevHash` VARCHAR(64) NULL,
  ADD COLUMN `hash`     VARCHAR(64) NULL;

-- Index used by the verifier when walking forks / orphans.
CREATE INDEX `AuditLog_organizationId_hash_idx` ON `AuditLog`(`organizationId`, `hash`);
