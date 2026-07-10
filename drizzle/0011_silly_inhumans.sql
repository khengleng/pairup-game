ALTER TABLE `users` ADD `blocked` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `blockReason` varchar(255);