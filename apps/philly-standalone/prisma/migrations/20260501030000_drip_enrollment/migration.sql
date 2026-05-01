-- Bundle BZ — DripEnrollment + dispatcher
--
-- One row per (campaign, contact). The cron polls
-- `WHERE status='active' AND nextDueAt <= now()` and dispatches
-- the step at lastStepIndex + 1, then advances.

CREATE TABLE IF NOT EXISTS "DripEnrollment" (
  "id"              TEXT NOT NULL,
  "campaignId"      TEXT NOT NULL,
  "contactId"       TEXT NOT NULL,
  "organizationId"  TEXT NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'active',
  "lastStepIndex"   INTEGER NOT NULL DEFAULT -1,
  "nextDueAt"       TIMESTAMP(3),
  "lastDeliveredAt" TIMESTAMP(3),
  "lastError"       TEXT,
  "attemptCount"    INTEGER NOT NULL DEFAULT 0,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DripEnrollment_pkey" PRIMARY KEY ("id")
);

-- One enrollment per (campaign, contact) — re-enroll requires
-- explicit unenroll first, which is the safe default.
CREATE UNIQUE INDEX IF NOT EXISTS "DripEnrollment_campaignId_contactId_key"
  ON "DripEnrollment" ("campaignId", "contactId");

-- Hot-path cron lookup index — `WHERE organizationId = ?
-- AND status = 'active' AND nextDueAt <= now()`.
CREATE INDEX IF NOT EXISTS "DripEnrollment_organizationId_status_nextDueAt_idx"
  ON "DripEnrollment" ("organizationId", "status", "nextDueAt");

CREATE INDEX IF NOT EXISTS "DripEnrollment_contactId_idx"
  ON "DripEnrollment" ("contactId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DripEnrollment_campaignId_fkey'
  ) THEN
    ALTER TABLE "DripEnrollment" ADD CONSTRAINT "DripEnrollment_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "DripCampaign"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
