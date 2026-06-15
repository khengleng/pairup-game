CREATE TABLE `gameThemes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(120) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gameThemes_id` PRIMARY KEY(`id`),
	CONSTRAINT `gameThemes_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `gameThemePairs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`themeId` int NOT NULL,
	`pairOrder` int NOT NULL,
	`term` varchar(255) NOT NULL,
	`definition` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gameThemePairs_id` PRIMARY KEY(`id`)
);
