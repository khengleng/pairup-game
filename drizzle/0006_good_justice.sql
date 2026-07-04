CREATE TABLE `appState` (
	`key` varchar(120) NOT NULL,
	`value` varchar(255),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appState_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `telegramChats` (
	`chatId` bigint NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastActiveAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegramChats_chatId` PRIMARY KEY(`chatId`)
);
