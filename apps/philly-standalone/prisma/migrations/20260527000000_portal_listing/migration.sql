-- 2026-05-27 — PortalListing for EU portal publish targets (Funda + IS24).
--
-- One Property row can have multiple PortalListing rows — publish the
-- same Property to Funda + IS24 + Immoweb in one click; each portal
-- gets its own row carrying the portal's external id.
--
-- The unique constraint on (portal, externalId) is how webhook events
-- find their way back to a Property: when Funda forwards a lead with
-- listingId="funda-prop_42-1700", we look up the PortalListing row
-- by (portal='funda', externalId='funda-prop_42-1700') → propertyId.
--
-- The unique constraint on (organizationId, propertyId, portal) is
-- the upsert key for the publish route — a second publish to the
-- same portal updates the existing row instead of creating a duplicate.

CREATE TABLE `PortalListing` (
  `id`             VARCHAR(191)  NOT NULL,
  `organizationId` VARCHAR(191)  NOT NULL,
  `propertyId`     VARCHAR(191)  NOT NULL,
  `portal`         VARCHAR(191)  NOT NULL,
  `externalId`     VARCHAR(191)  NOT NULL,
  `externalUrl`    VARCHAR(191)  NULL,
  `status`         VARCHAR(191)  NOT NULL DEFAULT 'draft',
  `lastSyncAt`     DATETIME(3)   NULL,
  `lastError`      TEXT          NULL,
  `createdAt`      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3)   NOT NULL,

  PRIMARY KEY (`id`),

  -- Webhook lookup path: portal+externalId → propertyId.
  UNIQUE INDEX `PortalListing_portal_externalId_key` (`portal`, `externalId`),

  -- Publish upsert key: (org, property, portal) → one row only.
  UNIQUE INDEX `PortalListing_organizationId_propertyId_portal_key`
    (`organizationId`, `propertyId`, `portal`),

  INDEX `PortalListing_organizationId_portal_idx` (`organizationId`, `portal`),
  INDEX `PortalListing_propertyId_idx` (`propertyId`),

  CONSTRAINT `PortalListing_propertyId_fkey`
    FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
