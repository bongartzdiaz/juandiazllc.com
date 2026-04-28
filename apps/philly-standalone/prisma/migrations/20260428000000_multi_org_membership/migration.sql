-- Multi-org membership (Bundle G).
--
-- Every (user, org) pair is one row.  User.organizationId becomes the
-- "home org" — the one a user was originally created in — and the
-- canonical source for role/sections within that org.  Memberships
-- in OTHER orgs add additional org access.  At schema-creation time
-- we backfill one Membership per existing User row so the live
-- system migrates without downtime.

CREATE TABLE `Membership` (
  `id`                VARCHAR(191) NOT NULL,
  `userId`            VARCHAR(191) NOT NULL,
  `organizationId`    VARCHAR(191) NOT NULL,
  `role`              VARCHAR(191) NOT NULL DEFAULT 'viewer',
  `dashboardSections` JSON         NULL,
  `createdAt`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`         DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Membership_userId_organizationId_key` (`userId`, `organizationId`),
  INDEX `Membership_userId_idx` (`userId`),
  INDEX `Membership_organizationId_role_idx` (`organizationId`, `role`),
  CONSTRAINT `Membership_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Membership_organizationId_fkey`
    FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Backfill: one Membership per existing User row.  We use the User
-- table's id as the deterministic source for the membership id (with
-- a `mig-` prefix) so a re-run of this migration would no-op rather
-- than duplicate.  Prisma's createMany would also work but the SQL
-- is faster + transparent.
INSERT INTO `Membership` (
  `id`, `userId`, `organizationId`, `role`,
  `dashboardSections`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('mig-', `id`)            AS `id`,
  `id`                              AS `userId`,
  `organizationId`                  AS `organizationId`,
  `role`                            AS `role`,
  `dashboardSections`               AS `dashboardSections`,
  `createdAt`                       AS `createdAt`,
  `createdAt`                       AS `updatedAt`
FROM `User`
WHERE `organizationId` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `Membership` `m`
    WHERE `m`.`userId` = `User`.`id`
      AND `m`.`organizationId` = `User`.`organizationId`
  );
