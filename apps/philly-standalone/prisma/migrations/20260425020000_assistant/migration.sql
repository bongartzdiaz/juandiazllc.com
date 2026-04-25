-- In-app AI assistant tables. Each tenant has its own conversation
-- history and structured memory; all rows scope by organizationId.

CREATE TABLE `AssistantConversation` (
  `id`             VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `userId`         VARCHAR(191) NOT NULL,
  `title`          VARCHAR(191) NOT NULL DEFAULT 'Untitled chat',
  `createdAt`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `AssistantConversation_organizationId_userId_updatedAt_idx`
    (`organizationId`, `userId`, `updatedAt`),
  CONSTRAINT `AssistantConversation_organizationId_fkey`
    FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `AssistantConversation_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE `AssistantTurn` (
  `id`               VARCHAR(191) NOT NULL,
  `conversationId`   VARCHAR(191) NOT NULL,
  `role`             VARCHAR(191) NOT NULL,
  `content`          LONGTEXT NOT NULL,
  `retrievedDocs`    TEXT NOT NULL,
  `promptTokens`     INT NOT NULL DEFAULT 0,
  `completionTokens` INT NOT NULL DEFAULT 0,
  `model`            VARCHAR(191) NULL,
  `createdAt`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `AssistantTurn_conversationId_createdAt_idx`
    (`conversationId`, `createdAt`),
  CONSTRAINT `AssistantTurn_conversationId_fkey`
    FOREIGN KEY (`conversationId`) REFERENCES `AssistantConversation`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `AssistantMemory` (
  `id`             VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `userId`         VARCHAR(191) NOT NULL,
  `key`            VARCHAR(191) NOT NULL,
  `value`          TEXT NOT NULL,
  `sourceTurnId`   VARCHAR(191) NULL,
  `createdAt`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `AssistantMemory_userId_key_key` (`userId`, `key`),
  INDEX `AssistantMemory_organizationId_userId_idx`
    (`organizationId`, `userId`),
  CONSTRAINT `AssistantMemory_organizationId_fkey`
    FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `AssistantMemory_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
);
