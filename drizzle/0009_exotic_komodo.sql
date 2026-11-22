CREATE TABLE `backup_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`record_count` integer DEFAULT 0 NOT NULL,
	`size_bytes` integer DEFAULT 0 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_backup_object_key` ON `backup_snapshots` (`object_key`);--> statement-breakpoint
CREATE INDEX `idx_backup_company_created` ON `backup_snapshots` (`company_id`,`created_at`);