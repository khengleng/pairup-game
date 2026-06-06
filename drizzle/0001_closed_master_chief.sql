CREATE TABLE `games` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`theme` enum('Products','Features','Team Members') NOT NULL,
	`gridSize` enum('4x4','6x6','8x8') NOT NULL,
	`moves` int NOT NULL,
	`timeSeconds` int NOT NULL,
	`completed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `games_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leaderboard` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`playerName` varchar(255),
	`theme` enum('Products','Features','Team Members') NOT NULL,
	`gridSize` enum('4x4','6x6','8x8') NOT NULL,
	`bestScore` int NOT NULL,
	`bestMoves` int NOT NULL,
	`bestTimeSeconds` int NOT NULL,
	`gamesPlayed` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leaderboard_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`company` varchar(255) NOT NULL,
	`gameId` int,
	`score` int,
	`theme` enum('Products','Features','Team Members'),
	`gridSize` enum('4x4','6x6','8x8'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`theme` enum('Products','Features','Team Members') NOT NULL,
	`gridSize` enum('4x4','6x6','8x8') NOT NULL,
	`bestMoves` int NOT NULL,
	`bestTimeSeconds` int NOT NULL,
	`totalScore` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scores_id` PRIMARY KEY(`id`)
);
