CREATE TABLE `appGames` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appGames_id` PRIMARY KEY(`id`),
	CONSTRAINT `appGames_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `shakeStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`playerName` varchar(255),
	`game` enum('dice','klaklok') NOT NULL,
	`bestScore` int NOT NULL DEFAULT 0,
	`totalRolls` int NOT NULL DEFAULT 0,
	`totalScore` int NOT NULL DEFAULT 0,
	`jackpots` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shakeStats_id` PRIMARY KEY(`id`)
);
