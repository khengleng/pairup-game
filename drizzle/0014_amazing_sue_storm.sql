CREATE TABLE `adminUsers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(64) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`role` enum('super_admin','campaign_manager','approver','operator','prize_manager','compliance_officer','fraud_analyst','auditor') NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastLoginAt` timestamp,
	CONSTRAINT `adminUsers_id` PRIMARY KEY(`id`),
	CONSTRAINT `adminUsers_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `approvalRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` varchar(64) NOT NULL,
	`entity` varchar(64) NOT NULL,
	`entityId` varchar(64),
	`payload` json NOT NULL,
	`summary` varchar(512),
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`requestedBy` int,
	`requestedByName` varchar(120),
	`reviewedBy` int,
	`reviewedByName` varchar(120),
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `approvalRequests_id` PRIMARY KEY(`id`)
);
