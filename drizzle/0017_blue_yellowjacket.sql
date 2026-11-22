CREATE TABLE `contract_equipment_items` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`contract_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`billing_mode` text DEFAULT 'Mensal' NOT NULL,
	`monthly_equipment_cents` integer DEFAULT 0 NOT NULL,
	`monthly_operator_cents` integer DEFAULT 0 NOT NULL,
	`mobilization_cents` integer DEFAULT 0 NOT NULL,
	`demobilization_cents` integer DEFAULT 0 NOT NULL,
	`quantity_milli` integer DEFAULT 1000 NOT NULL,
	`status` text DEFAULT 'mobilized' NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_contract_items_contract` ON `contract_equipment_items` (`company_id`,`contract_id`);--> statement-breakpoint
CREATE INDEX `idx_contract_items_equipment` ON `contract_equipment_items` (`company_id`,`equipment_id`);--> statement-breakpoint
ALTER TABLE `contracts` ADD `document_kind` text DEFAULT 'initial' NOT NULL;--> statement-breakpoint
ALTER TABLE `contracts` ADD `parent_contract_id` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `amendment_number` integer;--> statement-breakpoint
ALTER TABLE `contracts` ADD `supplier_name` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `project_name` text;