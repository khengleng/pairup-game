CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorId` int,
	`actorRole` varchar(64),
	`action` varchar(128) NOT NULL,
	`entity` varchar(64) NOT NULL,
	`entityId` varchar(64),
	`before` json,
	`after` json,
	`reason` text,
	`approvalRef` varchar(64),
	`ip` varchar(64),
	`device` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scratchAwards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`campaignId` int NOT NULL,
	`userId` int NOT NULL,
	`prizeTierId` int NOT NULL,
	`voucherCodeId` int,
	`claimRef` varchar(32) NOT NULL,
	`status` enum('pending','verification','approved','fulfilled','rejected','expired','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scratchAwards_id` PRIMARY KEY(`id`),
	CONSTRAINT `scratchAwards_claimRef_unique` UNIQUE(`claimRef`)
);
--> statement-breakpoint
CREATE TABLE `scratchCampaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(80) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`gameType` enum('matching_numbers','matching_symbols','pattern','matching_amounts') NOT NULL,
	`status` enum('draft','active','paused','ended') NOT NULL DEFAULT 'draft',
	`config` json NOT NULL,
	`winProbabilityBps` int NOT NULL DEFAULT 0,
	`dailyPlayLimit` int NOT NULL DEFAULT 0,
	`minAge` int NOT NULL DEFAULT 0,
	`countries` varchar(255),
	`termsUrl` varchar(512),
	`startsAt` timestamp,
	`expiresAt` timestamp,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scratchCampaigns_id` PRIMARY KEY(`id`),
	CONSTRAINT `scratchCampaigns_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `scratchPrizeTiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`valueLabel` varchar(255) NOT NULL,
	`valueCents` int NOT NULL DEFAULT 0,
	`requiredMatches` int NOT NULL DEFAULT 0,
	`totalQty` int NOT NULL DEFAULT 0,
	`reservedQty` int NOT NULL DEFAULT 0,
	`claimedQty` int NOT NULL DEFAULT 0,
	`weight` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scratchPrizeTiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scratchSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`userId` int,
	`playerName` varchar(255),
	`status` enum('created','completed','expired') NOT NULL DEFAULT 'created',
	`isWinner` boolean NOT NULL DEFAULT false,
	`prizeTierId` int,
	`card` json NOT NULL,
	`outcome` json NOT NULL,
	`nonce` varchar(64) NOT NULL,
	`signature` varchar(128) NOT NULL,
	`ip` varchar(64),
	`deviceHash` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `scratchSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scratchVoucherCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prizeTierId` int NOT NULL,
	`code` varchar(128) NOT NULL,
	`status` enum('available','reserved','claimed','void') NOT NULL DEFAULT 'available',
	`sessionId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scratchVoucherCodes_id` PRIMARY KEY(`id`)
);
