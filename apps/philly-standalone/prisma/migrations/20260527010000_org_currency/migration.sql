-- 2026-05-27 — Organization.currency for money formatting in reports +
-- invoices + portal publish payloads.
--
-- Default 'EUR' fits the EU-pivot baseline (Funda + IS24 + planned BE +
-- FR portals). Operators on USD/GBP/CHF set their own value via the
-- Settings → Organization UI.
--
-- Non-breaking: existing rows backfill to default EUR. If a tenant
-- was operating in USD before, the operator updates the column once
-- via Settings; the report generator picks up the new value on next
-- generate.

ALTER TABLE `Organization`
  ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'EUR';
