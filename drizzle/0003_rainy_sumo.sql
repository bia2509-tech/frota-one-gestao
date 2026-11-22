CREATE TABLE `fuel_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`entry_date` text NOT NULL,
	`rn` text,
	`station` text,
	`driver_name` text,
	`product` text NOT NULL,
	`product_code` text,
	`liters_milli` integer NOT NULL,
	`unit_price_milli` integer NOT NULL,
	`total_cents` integer NOT NULL,
	`kilometer` integer,
	`hourmeter` integer,
	`source` text NOT NULL,
	`import_file_name` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_fuel_company_date` ON `fuel_entries` (`company_id`,`entry_date`);--> statement-breakpoint
CREATE INDEX `idx_fuel_equipment_date` ON `fuel_entries` (`equipment_id`,`entry_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_fuel_company_rn` ON `fuel_entries` (`company_id`,`rn`);