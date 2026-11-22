ALTER TABLE `company_users` ADD `display_name` text;--> statement-breakpoint
ALTER TABLE `company_users` ADD `email` text;--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_company_users_company_email` ON `company_users` (`company_id`,`email`);