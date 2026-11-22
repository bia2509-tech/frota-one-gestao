CREATE TABLE `quick_service_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`entry_date` text NOT NULL,
	`category` text NOT NULL,
	`service_description` text NOT NULL,
	`supplier_name` text,
	`driver_name` text,
	`quantity_milli` integer DEFAULT 1000 NOT NULL,
	`unit_price_cents` integer DEFAULT 0 NOT NULL,
	`total_cents` integer DEFAULT 0 NOT NULL,
	`kilometer` integer,
	`hourmeter` integer,
	`cost_center` text,
	`requisition_number` text,
	`payment_responsibility` text DEFAULT 'company' NOT NULL,
	`invoice_number` text,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`source` text NOT NULL,
	`import_file_name` text,
	`observation` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_quick_service_company_date` ON `quick_service_entries` (`company_id`,`entry_date`);--> statement-breakpoint
CREATE INDEX `idx_quick_service_equipment_date` ON `quick_service_entries` (`equipment_id`,`entry_date`);