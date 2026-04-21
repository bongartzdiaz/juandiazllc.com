-- Per-user dashboard-section allow-list. Null = full access.
-- Array of section slugs = strict allow-list. Enforced by
-- `hasSection()` in lib/philly/sections.ts and by
-- `requireSection()` in lib/philly/auth-helpers.ts.
ALTER TABLE `User` ADD COLUMN `dashboardSections` JSON NULL;
