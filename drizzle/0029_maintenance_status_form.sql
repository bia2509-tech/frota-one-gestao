ALTER TABLE `maintenance_orders` ADD `maintenance_status` text DEFAULT 'Em lançamento' NOT NULL;--> statement-breakpoint
ALTER TABLE `maintenance_orders` ADD `maintenance_form_type` text DEFAULT 'normal_repair' NOT NULL;
