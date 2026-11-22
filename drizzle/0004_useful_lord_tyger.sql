CREATE TABLE `maintenance_order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`maintenance_order_id` text NOT NULL,
	`item_type` text NOT NULL,
	`product_service` text NOT NULL,
	`quantity_milli` integer NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`total_cents` integer NOT NULL,
	`status` text,
	`situation` text,
	`model` text,
	`invoice_number` text,
	`manufacturer` text,
	`supplier_name` text,
	`payment_responsibility` text NOT NULL,
	`service_class` text NOT NULL,
	`observation` text,
	`appropriation_posted` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`maintenance_order_id`) REFERENCES `maintenance_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_maintenance_items_order` ON `maintenance_order_items` (`maintenance_order_id`);--> statement-breakpoint
CREATE INDEX `idx_maintenance_items_appropriation` ON `maintenance_order_items` (`company_id`,`appropriation_posted`);--> statement-breakpoint
ALTER TABLE `maintenance_orders` ADD `order_kind` text DEFAULT 'daily_maintenance' NOT NULL;--> statement-breakpoint
ALTER TABLE `maintenance_orders` ADD `requested_by` text;--> statement-breakpoint
ALTER TABLE `maintenance_orders` ADD `prepared_by` text;--> statement-breakpoint
ALTER TABLE `maintenance_orders` ADD `maintenance_location` text;--> statement-breakpoint
ALTER TABLE `maintenance_orders` ADD `cost_center` text;--> statement-breakpoint
ALTER TABLE `maintenance_orders` ADD `service_type` text;--> statement-breakpoint
ALTER TABLE `maintenance_orders` ADD `kilometer` integer;--> statement-breakpoint
ALTER TABLE `maintenance_orders` ADD `hourmeter` integer;--> statement-breakpoint
ALTER TABLE `maintenance_orders` ADD `closed_at` text;