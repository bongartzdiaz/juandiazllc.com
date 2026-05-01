-- Bundle BQ — persist SCIM externalId on User
--
-- The IdP's stable identifier is now stored alongside email so
-- de-provisioning works without email round-trip. RFC 7644 §3.4
-- says "SHOULD support filter by externalId" — supports that too
-- (lib/philly/scim/filter.ts updated in the same bundle).

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "scimExternalId" TEXT;

CREATE INDEX IF NOT EXISTS "User_organizationId_scimExternalId_idx"
  ON "User" ("organizationId", "scimExternalId");
