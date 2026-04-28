-- Bundle R — SCIM 2.0 scope grants on ApiKey.
--
-- New `scopes` column holds a JSON array of grant strings (e.g.
-- ["scim:users"]). Existing keys leave the column NULL and continue
-- to work for the legacy `permissions`-based routes. SCIM endpoints
-- additionally require the scopes column to grant `scim:users`.
-- Idempotent.

ALTER TABLE `ApiKey`
  ADD COLUMN IF NOT EXISTS `scopes` TEXT NULL;
