-- Bundle BJ — FeatureFlag hardening
--
-- Two follow-up fixes from the BD audit:
--
-- 1. The FK constraint added in 20260430000000 used a bare
--    `ALTER TABLE ADD CONSTRAINT`, which throws on re-run if the
--    constraint already exists. Wrap in a DO block that swallows
--    duplicate_object so re-running this migration on a partial-
--    state DB is a no-op.
--
-- 2. PostgreSQL treats NULLs in a UNIQUE INDEX as distinct, so the
--    composite UNIQUE("organizationId", "key") in the original
--    migration does NOT prevent two global-default rows
--    (organizationId IS NULL, same key). That makes Prisma's
--    `upsert` unreliable for the global slot — on rotation it can
--    create duplicates. Add a partial unique index restricted to
--    the global slot (organizationId IS NULL) to enforce
--    one-row-per-key globally.

-- 1. FK constraint — idempotent re-add. If it already exists from
-- the previous migration this catches duplicate_object and moves on.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FeatureFlag_organizationId_fkey'
  ) THEN
    ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 2. Partial unique index for the global slot. Coexists with the
-- composite UNIQUE("organizationId", "key") which still enforces
-- per-org uniqueness; this one fills the NULL gap.
CREATE UNIQUE INDEX IF NOT EXISTS "FeatureFlag_global_key_uniq"
  ON "FeatureFlag" ("key")
  WHERE "organizationId" IS NULL;
