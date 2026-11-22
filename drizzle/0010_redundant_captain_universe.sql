CREATE TABLE `master_data` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`type` text NOT NULL,
	`code` text,
	`name` text NOT NULL,
	`description` text,
	`active` integer DEFAULT true NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_master_company_type_name` ON `master_data` (`company_id`,`type`,`name`);--> statement-breakpoint
CREATE INDEX `idx_master_company_type_active` ON `master_data` (`company_id`,`type`,`active`);