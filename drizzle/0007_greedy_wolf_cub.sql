CREATE TABLE `dailyWalks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`playerName` varchar(255),
	`walkDate` varchar(10) NOT NULL,
	`steps` int NOT NULL DEFAULT 0,
	`goalMet` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dailyWalks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `walkSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`steps` int NOT NULL DEFAULT 0,
	`completed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `walkSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `walkStreak` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `bestWalkStreak` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lastWalkDate` varchar(10);