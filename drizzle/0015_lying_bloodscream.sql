CREATE TABLE `equipment_checklists` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`checklist_type` text DEFAULT 'entry' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`items_json` text NOT NULL,
	`observation` text,
	`performed_by` text NOT NULL,
	`performed_at` text NOT NULL,
	`approved_at` text,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_equipment_checklist_equipment` ON `equipment_checklists` (`company_id`,`equipment_id`,`performed_at`);