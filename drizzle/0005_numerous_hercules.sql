CREATE TABLE `dailyScores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`playerName` varchar(255),
	`challengeDate` varchar(10) NOT NULL,
	`theme` varchar(255) NOT NULL,
	`gridSize` enum('4x4','6x6','8x8') NOT NULL,
	`score` int NOT NULL,
	`moves` int NOT NULL,
	`timeSeconds` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dailyScores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `dailyStreak` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `bestStreak` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lastDailyDate` varchar(10);