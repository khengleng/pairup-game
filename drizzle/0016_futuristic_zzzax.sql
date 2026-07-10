ALTER TABLE `adminUsers` ADD `mfaSecret` varchar(255);--> statement-breakpoint
ALTER TABLE `adminUsers` ADD `mfaEnabled` boolean DEFAULT false NOT NULL;