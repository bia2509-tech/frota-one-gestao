CREATE TABLE `equipment_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`document_type` text NOT NULL,
	`file_name` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`reading_status` text DEFAULT 'stored' NOT NULL,
	`uploaded_by` text NOT NULL,
	`uploaded_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_equipment_documents_equipment` ON `equipment_documents` (`company_id`,`equipment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_equipment_documents_object` ON `equipment_documents` (`object_key`);