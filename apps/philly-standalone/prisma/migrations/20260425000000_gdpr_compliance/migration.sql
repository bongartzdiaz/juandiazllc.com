-- GDPR Bundle A — Art. 15 (access), 17 (erasure), 30 (records).
-- Adds two scheduling columns on User and three append-only audit
-- tables that prove data-subject-rights operations to a regulator
-- without retaining the underlying PII (we hash emails with SHA-256).

ALTER TABLE `User`
  ADD COLUMN `deletionScheduledAt` DATETIME(3) NULL,
  ADD COLUMN `deletionRequestedAt` DATETIME(3) NULL;

CREATE TABLE `GdprExportLog` (
  `id`               VARCHAR(191) NOT NULL,
  `organizationId`   VARCHAR(191) NOT NULL,
  `actorUserId`      VARCHAR(191) NULL,
  `subjectEmailHash` VARCHAR(191) NOT NULL,
  `channel`          VARCHAR(191) NOT NULL,
  `rowCounts`        TEXT NOT NULL,
  `actorIp`          VARCHAR(191) NULL,
  `createdAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `GdprExportLog_organizationId_createdAt_idx` (`organizationId`, `createdAt`),
  INDEX `GdprExportLog_subjectEmailHash_idx` (`subjectEmailHash`),
  CONSTRAINT `GdprExportLog_organizationId_fkey`
    FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE `GdprErasureLog` (
  `id`               VARCHAR(191) NOT NULL,
  `organizationId`   VARCHAR(191) NOT NULL,
  `actorUserId`      VARCHAR(191) NULL,
  `subjectEmailHash` VARCHAR(191) NOT NULL,
  `channel`          VARCHAR(191) NOT NULL,
  `modelsErased`     TEXT NOT NULL,
  `rowCounts`        TEXT NOT NULL,
  `reason`           TEXT NULL,
  `actorIp`          VARCHAR(191) NULL,
  `createdAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `GdprErasureLog_organizationId_createdAt_idx` (`organizationId`, `createdAt`),
  INDEX `GdprErasureLog_subjectEmailHash_idx` (`subjectEmailHash`),
  CONSTRAINT `GdprErasureLog_organizationId_fkey`
    FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE `GdprConsentRecord` (
  `id`               VARCHAR(191) NOT NULL,
  `organizationId`   VARCHAR(191) NOT NULL,
  `subjectEmailHash` VARCHAR(191) NOT NULL,
  `purpose`          VARCHAR(191) NOT NULL,
  `granted`          BOOLEAN      NOT NULL DEFAULT TRUE,
  `withdrawn`        BOOLEAN      NOT NULL DEFAULT FALSE,
  `noticeShown`      TEXT NULL,
  `ipAddress`        VARCHAR(191) NULL,
  `userAgent`        TEXT NULL,
  `createdAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `GdprConsentRecord_organizationId_subjectEmailHash_idx` (`organizationId`, `subjectEmailHash`),
  INDEX `GdprConsentRecord_purpose_createdAt_idx` (`purpose`, `createdAt`),
  CONSTRAINT `GdprConsentRecord_organizationId_fkey`
    FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
);
