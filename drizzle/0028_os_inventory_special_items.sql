ALTER TABLE `maintenance_order_items` ADD `discount_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `maintenance_order_items` ADD `item_origin` text DEFAULT 'direct_purchase' NOT NULL;--> statement-breakpoint
ALTER TABLE `maintenance_order_items` ADD `tire_previous_identification` text;--> statement-breakpoint
ALTER TABLE `maintenance_order_items` ADD `tire_current_identification` text;--> statement-breakpoint
ALTER TABLE `maintenance_order_items` ADD `tire_dot` text;--> statement-breakpoint
ALTER TABLE `maintenance_order_items` ADD `tire_condition` text;--> statement-breakpoint
ALTER TABLE `maintenance_order_items` ADD `tire_removed_destination` text;--> statement-breakpoint
ALTER TABLE `maintenance_order_items` ADD `battery_certificate_number` text;--> statement-breakpoint
ALTER TABLE `maintenance_order_items` ADD `battery_invoice_number` text;--> statement-breakpoint
ALTER TABLE `fiscal_invoice_items` ADD `stock_entry` integer DEFAULT false NOT NULL;
