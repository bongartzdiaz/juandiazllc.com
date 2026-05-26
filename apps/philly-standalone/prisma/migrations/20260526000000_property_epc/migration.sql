-- EU pivot 2026-05-26 — energy certification fields on Property.
--
-- MANDATORY display in EU residential listings since 2021 per the
-- EU Energy Performance of Buildings Directive (EPBD). Without these,
-- Funda / ImmoScout24 / Idealista / SeLoger reject the listing.
--
-- Country naming reference (for the UI translator):
--   NL  "energielabel"
--   DE  "Energieausweis"
--   FR  "DPE" (Diagnostic de Performance Énergétique)
--   ES  "Certificado de Eficiencia Energética"
--   BE  "EPC" (Vlaanderen) / "PEB" (Wallonie)
--
-- Both columns are NULL on existing rows — additive migration, safe to
-- deploy without backfill. The UI conditionally renders these fields
-- only when org.industry === 'real_estate' so non-RE tenants don't see
-- the noise.
--
-- Grades enforced by the application layer (zod schema in
-- lib/philly/validation/schemas.ts) — A++, A+, A, B, C, D, E, F, G.
-- Kept as VARCHAR rather than ENUM to allow future grade refinements
-- (e.g., the Netherlands sub-grades like A+++).

ALTER TABLE `Property`
  ADD COLUMN `epcRating`    VARCHAR(8)  NULL,
  ADD COLUMN `epcExpiresAt` DATETIME(3) NULL;

-- Index on epcExpiresAt for the "EPC expiring soon" reminder job
-- that the housekeeping cron will eventually use to nag agents.
CREATE INDEX `Property_epcExpiresAt_idx` ON `Property` (`epcExpiresAt`);
