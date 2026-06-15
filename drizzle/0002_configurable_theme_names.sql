ALTER TABLE `games` MODIFY COLUMN `theme` varchar(255) NOT NULL;
--> statement-breakpoint
ALTER TABLE `scores` MODIFY COLUMN `theme` varchar(255) NOT NULL;
--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `theme` varchar(255);
--> statement-breakpoint
ALTER TABLE `leaderboard` MODIFY COLUMN `theme` varchar(255) NOT NULL;
