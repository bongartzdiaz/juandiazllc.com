-- Bundle CC audit fix — DripEnrollment FK gap
--
-- The original BZ migration (20260501030000_drip_enrollment) only
-- declared the FK to DripCampaign. contactId + organizationId
-- were plain TEXT columns — meaning a Contact erasure run (GDPR
-- Art. 17) didn't cascade-clean the enrollments, and an
-- Organization deletion left orphan rows. Add both FKs with
-- ON DELETE CASCADE.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DripEnrollment_contactId_fkey'
  ) THEN
    ALTER TABLE "DripEnrollment" ADD CONSTRAINT "DripEnrollment_contactId_fkey"
      FOREIGN KEY ("contactId") REFERENCES "Contact"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DripEnrollment_organizationId_fkey'
  ) THEN
    ALTER TABLE "DripEnrollment" ADD CONSTRAINT "DripEnrollment_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
