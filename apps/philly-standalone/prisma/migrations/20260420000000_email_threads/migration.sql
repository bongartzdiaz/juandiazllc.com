-- CreateTable
CREATE TABLE `EmailThread` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `providerThreadId` VARCHAR(255) NOT NULL,
    `contactId` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NOT NULL DEFAULT '',
    `snippet` TEXT NOT NULL,
    `participants` TEXT NOT NULL,
    `messageCount` INTEGER NOT NULL DEFAULT 0,
    `unreadCount` INTEGER NOT NULL DEFAULT 0,
    `lastMessageAt` DATETIME(3) NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `labels` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EmailThread_accountId_providerThreadId_key`(`accountId`, `providerThreadId`),
    INDEX `EmailThread_accountId_idx`(`accountId`),
    INDEX `EmailThread_contactId_idx`(`contactId`),
    INDEX `EmailThread_lastMessageAt_idx`(`lastMessageAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable (add columns and unique constraint to Email)
-- TEXT columns use expression defaults (MySQL 8.0.13+ / MariaDB 10.2+).
ALTER TABLE `Email`
    ADD COLUMN `threadRowId` VARCHAR(191) NULL,
    ADD COLUMN `snippet` TEXT NOT NULL DEFAULT (''),
    ADD COLUMN `labels` TEXT NOT NULL DEFAULT ('[]');

-- CreateIndex
CREATE INDEX `Email_threadRowId_idx` ON `Email`(`threadRowId`);

-- CreateUniqueIndex (dedupe key across sync runs)
-- NOTE: existing rows with NULL messageId are fine — MySQL treats NULLs as
-- distinct for unique constraints, so upserts can still match-by-id on sync.
CREATE UNIQUE INDEX `Email_accountId_messageId_key` ON `Email`(`accountId`, `messageId`);

-- AddForeignKey
ALTER TABLE `EmailThread` ADD CONSTRAINT `EmailThread_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `EmailAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Email` ADD CONSTRAINT `Email_threadRowId_fkey` FOREIGN KEY (`threadRowId`) REFERENCES `EmailThread`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
