-- Bundle BW — SCIM Groups (RFC 7643 §4.2 / RFC 7644 §3.5)
--
-- ScimGroup: an IdP group surfaced via SCIM. Operators set
-- `role` / `dashboardSections` on the row via the admin UI; when
-- the IdP issues a member-add PATCH, the user's Membership in
-- that org gets upserted to the group's role + sections, which
-- is how `engineering` → manager / `marketing` → viewer mapping
-- works without per-IdP claim parsing.
--
-- ScimGroupMembership: many-to-many join. Cascades on either
-- side so we don't leak orphans.

CREATE TABLE IF NOT EXISTS "ScimGroup" (
  "id"                TEXT NOT NULL,
  "organizationId"    TEXT NOT NULL,
  "scimExternalId"    TEXT,
  "displayName"       TEXT NOT NULL,
  "role"              TEXT,
  "dashboardSections" JSONB,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ScimGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ScimGroup_organizationId_displayName_key"
  ON "ScimGroup" ("organizationId", "displayName");

CREATE INDEX IF NOT EXISTS "ScimGroup_organizationId_scimExternalId_idx"
  ON "ScimGroup" ("organizationId", "scimExternalId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScimGroup_organizationId_fkey'
  ) THEN
    ALTER TABLE "ScimGroup" ADD CONSTRAINT "ScimGroup_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;


CREATE TABLE IF NOT EXISTS "ScimGroupMembership" (
  "id"        TEXT NOT NULL,
  "groupId"   TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScimGroupMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ScimGroupMembership_groupId_userId_key"
  ON "ScimGroupMembership" ("groupId", "userId");

CREATE INDEX IF NOT EXISTS "ScimGroupMembership_userId_idx"
  ON "ScimGroupMembership" ("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScimGroupMembership_groupId_fkey'
  ) THEN
    ALTER TABLE "ScimGroupMembership" ADD CONSTRAINT "ScimGroupMembership_groupId_fkey"
      FOREIGN KEY ("groupId") REFERENCES "ScimGroup"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScimGroupMembership_userId_fkey'
  ) THEN
    ALTER TABLE "ScimGroupMembership" ADD CONSTRAINT "ScimGroupMembership_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
