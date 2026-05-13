-- Bundle CX — Stripe subscription mirror table.
--
-- One row per Organization that has gone through Checkout. The
-- Stripe-side webhook (app/api/webhooks/stripe/route.ts) keeps
-- `status` / `currentPeriodEnd` / `cancelAtPeriodEnd` in sync with
-- subscription.{created,updated,deleted} events. We don't store
-- invoice history here — Stripe Dashboard owns that.
--
-- Indexes:
--   * unique on organizationId (one subscription per org)
--   * unique on stripeCustomerId + stripeSubscriptionId for webhook lookups
--   * btree on status / currentPeriodEnd for the renewal-window cron job

CREATE TABLE `Subscription` (
  `id`                   VARCHAR(191) NOT NULL,
  `organizationId`       VARCHAR(191) NOT NULL,
  `stripeCustomerId`     VARCHAR(191) NOT NULL,
  `stripeSubscriptionId` VARCHAR(191) NULL,
  `stripePriceId`        VARCHAR(191) NULL,
  `plan`                 VARCHAR(32)  NOT NULL,
  `status`               VARCHAR(32)  NOT NULL,
  `currentPeriodStart`   DATETIME(3)  NULL,
  `currentPeriodEnd`     DATETIME(3)  NULL,
  `cancelAtPeriodEnd`    TINYINT(1)   NOT NULL DEFAULT 0,
  `trialEndsAt`          DATETIME(3)  NULL,
  `createdAt`            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`            DATETIME(3)  NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `Subscription_organizationId_key`       (`organizationId`),
  UNIQUE KEY `Subscription_stripeCustomerId_key`     (`stripeCustomerId`),
  UNIQUE KEY `Subscription_stripeSubscriptionId_key` (`stripeSubscriptionId`),
  KEY `Subscription_status_idx`             (`status`),
  KEY `Subscription_currentPeriodEnd_idx`   (`currentPeriodEnd`),

  CONSTRAINT `Subscription_organizationId_fkey`
    FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
