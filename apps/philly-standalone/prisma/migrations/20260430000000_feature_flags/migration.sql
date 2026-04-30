-- Bundle BD — FeatureFlag table
--
-- Per-org kill-switch + feature toggle without redeploy.
-- organizationId NULL = global default; specific org row overrides.
-- Resolution lives in lib/philly/features.ts with 60s cache TTL.

CREATE TABLE IF NOT EXISTS "FeatureFlag" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT,
  "key"            TEXT NOT NULL,
  "enabled"        BOOLEAN NOT NULL DEFAULT true,
  "description"    TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- Composite uniqueness — at most one row per (org, key). NULL org
-- means "global default" and is treated as a distinct slot.
CREATE UNIQUE INDEX IF NOT EXISTS "FeatureFlag_organizationId_key_key"
  ON "FeatureFlag" ("organizationId", "key");

-- Hot-path lookup index — `WHERE key = ? AND organizationId IN (?, NULL)`
CREATE INDEX IF NOT EXISTS "FeatureFlag_key_idx"
  ON "FeatureFlag" ("key");

-- Cascade so dropping an org cleans its overrides automatically.
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
