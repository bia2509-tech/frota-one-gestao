CREATE TABLE `daily_part_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`entry_date` text NOT NULL,
	`status` text NOT NULL,
	`maintenance_order_id` text,
	`hourmeter_start` integer,
	`hourmeter_end` integer,
	`kilometer_start` integer,
	`kilometer_end` integer,
	`observation` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`maintenance_order_id`) REFERENCES `maintenance_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_daily_part_company_equipment_date` ON `daily_part_entries` (`company_id`,`equipment_id`,`entry_date`);--> statement-breakpoint
CREATE INDEX `idx_daily_part_company_date` ON `daily_part_entries` (`company_id`,`entry_date`);--> statement-breakpoint
CREATE INDEX `idx_daily_part_equipment_os_date` ON `daily_part_entries` (`equipment_id`,`maintenance_order_id`,`entry_date`);--> statement-breakpoint
ALTER TABLE `equipment` ADD `monthly_rent_cents` integer DEFAULT 0 NOT NULL;