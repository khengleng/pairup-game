ALTER TABLE `leads` ADD `verified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `verifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `leads` ADD `consentAt` timestamp;--> statement-breakpoint
ALTER TABLE `leads` ADD `verificationCodeHash` varchar(64);--> statement-breakpoint
ALTER TABLE `leads` ADD `verificationExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `leads` ADD `verificationAttempts` int DEFAULT 0 NOT NULL;
