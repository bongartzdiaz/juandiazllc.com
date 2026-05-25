-- Bundle DEUS — super-admin feature-toggle override layer.
--
-- One row per (organization, feature) pair where a platform-level admin
-- (User.role='superAdmin', enforced at the API route) has explicitly
-- forced the feature ON or OFF for that org. Rows are write-once-via-upsert:
-- the unique key (organizationId, feature) means a re-toggle UPDATEs the
-- existing row rather than creating duplicates.
--
-- `state` is a string column (not a MySQL ENUM) for two reasons:
--   1. Consistency with existing String-based discriminators
--      (User.role, AuditLog.action)
--   2. Adding new states (e.g., 'FORCED_ON_WITH_QUOTA') in the future
--      doesn't require an ALTER TABLE
-- Allowed values are enforced by the route-layer zod schema, see
-- lib/philly/validation/schemas.ts and lib/philly/features/resolve.ts
-- (SuperAdminOverride type).
--
-- `reason` is mandatory at the route level (zod min(10)) — every
-- super-admin override has a human-readable justification stored
-- alongside, which also lands in AuditLog.changes for compliance.
--
-- Indexes:
--   * unique on (organizationId, feature) — one override per feature per org
--   * btree on feature — for "show me every override of WEBHOOKS across orgs" admin queries
--   * btree on createdById — for "show me every action this super-admin took" audit drilldown
--
-- Foreign keys:
--   * organizationId → Organization(id) ON DELETE CASCADE — when an org
--     is deleted, its overrides go with it
--   * createdById → User(id) ON DELETE NO ACTION — preserve the override
--     row even if the super-admin's User row is later deleted; the
--     dangling reference is acceptable for audit purposes (the createdAt
--     timestamp + AuditLog.changes record what happened)

CREATE TABLE `OrgFeatureOverride` (
  `id`             VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `feature`        VARCHAR(191) NOT NULL,
  `state`          VARCHAR(191) NOT NULL DEFAULT 'INHERIT',
  `reason`         TEXT NOT NULL,
  `createdById`    VARCHAR(191) NOT NULL,
  `createdAt`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `OrgFeatureOverride_organizationId_feature_key` (`organizationId`, `feature`),
  KEY `OrgFeatureOverride_feature_idx` (`feature`),
  KEY `OrgFeatureOverride_createdById_idx` (`createdById`),

  CONSTRAINT `OrgFeatureOverride_organizationId_fkey`
    FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `OrgFeatureOverride_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User`(`id`)
    ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
