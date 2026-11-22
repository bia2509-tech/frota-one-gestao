ALTER TABLE `maintenance_orders` ADD `request_approval_status` text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `maintenance_orders` ADD `approval_requested_at` text;--> statement-breakpoint
ALTER TABLE `maintenance_orders` ADD `approval_requested_by` text;--> statement-breakpoint
ALTER TABLE `maintenance_orders` ADD `approved_at` text;--> statement-breakpoint
ALTER TABLE `maintenance_orders` ADD `approved_by` text;
