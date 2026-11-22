CREATE TABLE `quotation_maps` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`number` text NOT NULL,
	`description` text NOT NULL,
	`cost_center` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_quotation_company_number` ON `quotation_maps` (`company_id`,`number`);--> statement-breakpoint
CREATE TABLE `quotation_options` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`quotation_map_id` text NOT NULL,
	`supplier_name` text NOT NULL,
	`total_cents` integer NOT NULL,
	`payment_terms` text,
	`delivery_days` integer,
	`validity_date` text,
	`selected` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`quotation_map_id`) REFERENCES `quotation_maps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_quotation_options_map` ON `quotation_options` (`quotation_map_id`);--> statement-breakpoint
ALTER TABLE `maintenance_orders` ADD `quotation_map_id` text;