CREATE TABLE `termsAcceptances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`campaignId` int NOT NULL,
	`ageConfirmed` boolean NOT NULL DEFAULT false,
	`country` varchar(64),
	`ip` varchar(64),
	`acceptedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `termsAcceptances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `scratchCampaigns` ADD `kycThresholdCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `scratchCampaigns` ADD `disclaimer` text;