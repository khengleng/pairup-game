CREATE INDEX `audit_created_idx` ON `auditLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `auditLogs` (`entity`,`entityId`);--> statement-breakpoint
CREATE INDEX `games_user_idx` ON `games` (`userId`);--> statement-breakpoint
CREATE INDEX `games_created_idx` ON `games` (`createdAt`);--> statement-breakpoint
CREATE INDEX `pl_user_idx` ON `pointsLedger` (`userId`);--> statement-breakpoint
CREATE INDEX `ref_referrer_idx` ON `referrals` (`referrerId`);--> statement-breakpoint
CREATE INDEX `sa_status_idx` ON `scratchAwards` (`status`);--> statement-breakpoint
CREATE INDEX `sa_campaign_idx` ON `scratchAwards` (`campaignId`);--> statement-breakpoint
CREATE INDEX `sa_user_idx` ON `scratchAwards` (`userId`);--> statement-breakpoint
CREATE INDEX `spt_campaign_idx` ON `scratchPrizeTiers` (`campaignId`);--> statement-breakpoint
CREATE INDEX `ss_campaign_idx` ON `scratchSessions` (`campaignId`);--> statement-breakpoint
CREATE INDEX `ss_user_idx` ON `scratchSessions` (`userId`);--> statement-breakpoint
CREATE INDEX `ss_created_idx` ON `scratchSessions` (`createdAt`);--> statement-breakpoint
CREATE INDEX `ss_device_idx` ON `scratchSessions` (`deviceHash`);--> statement-breakpoint
CREATE INDEX `ss_ip_idx` ON `scratchSessions` (`ip`);--> statement-breakpoint
CREATE INDEX `svc_tier_status_idx` ON `scratchVoucherCodes` (`prizeTierId`,`status`);--> statement-breakpoint
CREATE INDEX `svc_session_idx` ON `scratchVoucherCodes` (`sessionId`);--> statement-breakpoint
CREATE INDEX `ta_user_campaign_idx` ON `termsAcceptances` (`userId`,`campaignId`);